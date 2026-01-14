const { promisePool } = require("../config/database");
const { mapFacturaConDetalles } = require("../helpers/facturaMapper");
const { withTransaction } = require("../helpers/transactionHelper");
const { enviarError, enviarExito } = require("../helpers/responseHelpers");
const {
  emitMesaEstadoCambiado,
  emitGrupoDisuelto,
  emitMesasSeparadas,
  emitMesasActualizadas,
} = require("../websocket");

/**
 * Registrar un consumo de productos y generar factura automáticamente
 */
const registrarConsumo = async (req, res) => {
  try {
    const result = await withTransaction(async (connection) => {
      const { idCliente, productos, idMesa, idGrupo, observaciones } = req.body;

      // Validaciones básicas
      if (!idCliente) {
        const error = new Error("El ID del cliente es obligatorio");
        error.statusCode = 400;
        throw error;
      }

      if (!productos || !Array.isArray(productos) || productos.length === 0) {
        const error = new Error("Debe proporcionar al menos un producto");
        error.statusCode = 400;
        throw error;
      }

      // Validar que no se envíen ambos: mesa y grupo
      if (idMesa && idGrupo) {
        const error = new Error(
          "No puede especificar tanto mesa individual como grupo de mesas"
        );
        error.statusCode = 400;
        throw error;
      }

      // 1. Verificar que el cliente existe y obtener información de su tarjeta
      const [clienteRows] = await connection.execute(
        `SELECT c.id_cliente, c.nombre, c.apellido, c.email,
              t.id_tarjeta, t.id_tipo_suscripcion, t.saldo_actual,
              ts.nombre AS tipo_suscripcion,
              ns.limite_credito
       FROM Cliente c
       LEFT JOIN Tarjeta t ON c.id_tarjeta = t.id_tarjeta
       LEFT JOIN TipoSuscripcion ts ON t.id_tipo_suscripcion = ts.id_tipo
       LEFT JOIN NivelSuscripcion ns ON t.id_nivel_suscripcion = ns.id_nivel
       WHERE c.id_cliente = ?`,
        [idCliente]
      );

      if (clienteRows.length === 0) {
        const error = new Error(`No existe un cliente con ID ${idCliente}`);
        error.statusCode = 404;
        throw error;
      }

      const cliente = clienteRows[0];

      if (!cliente.id_tarjeta) {
        const error = new Error("El cliente no tiene una tarjeta asociada");
        error.statusCode = 400;
        throw error;
      }

      // 2. Verificar la mesa si se especificó
      if (idMesa) {
        const [mesaRows] = await connection.execute(
          `SELECT id_mesa, nombre FROM Mesa WHERE id_mesa = ?`,
          [idMesa]
        );

        if (mesaRows.length === 0) {
          const error = new Error(`No existe una mesa con ID ${idMesa}`);
          error.statusCode = 404;
          throw error;
        }
      }

      // 3. Verificar el grupo de mesas si se especificó
      if (idGrupo) {
        const [grupoRows] = await connection.execute(
          `SELECT id_grupo, nombre FROM GrupoMesas WHERE id_grupo = ?`,
          [idGrupo]
        );

        if (grupoRows.length === 0) {
          const error = new Error(`No existe un grupo de mesas con ID ${idGrupo}`);
          error.statusCode = 404;
          throw error;
        }
      }

      // 4. Validar todos los productos y calcular el total
      let total = 0;
      const productosValidados = [];

      for (const item of productos) {
        if (!item.idProducto || !item.cantidad) {
          const error = new Error(
            "Cada producto debe tener idProducto y cantidad"
          );
          error.statusCode = 400;
          throw error;
        }

        const [productoRows] = await connection.execute(
          `SELECT id_producto, nombre, precio_unitario 
         FROM Producto 
         WHERE id_producto = ?`,
          [item.idProducto]
        );

        if (productoRows.length === 0) {
          const error = new Error(
            `No existe el producto con ID ${item.idProducto}`
          );
          error.statusCode = 404;
          throw error;
        }

        const producto = productoRows[0];
        const precioUnitario = item.precioUnitario || producto.precio_unitario;
        const cantidad = parseInt(item.cantidad);

        if (cantidad <= 0) {
          const error = new Error("La cantidad debe ser mayor a 0");
          error.statusCode = 400;
          throw error;
        }

        const subtotal = parseFloat(precioUnitario) * cantidad;
        total += subtotal;

        productosValidados.push({
          idProducto: item.idProducto,
          nombreProducto: producto.nombre,
          cantidad: cantidad,
          precioUnitario: parseFloat(precioUnitario),
          subtotal: subtotal,
        });
      }

      // 5. Verificar saldo o límite de crédito según el tipo de tarjeta
      if (cliente.tipo_suscripcion === "PREPAGA") {
        // PREPAGA: saldo_actual representa dinero disponible (positivo)
        const saldoActual = parseFloat(cliente.saldo_actual || 0);

        if (saldoActual < total) {
          const error = new Error("Saldo insuficiente para realizar el consumo");
          error.statusCode = 400;
          error.detalles = {
            saldoActual: saldoActual,
            totalConsumo: total,
            faltante: total - saldoActual,
          };
          throw error;
        }
      } else if (cliente.tipo_suscripcion === "CREDITO") {
        // CRÉDITO: saldo_actual representa deuda acumulada (positivo = debe dinero)
        const deudaActual = parseFloat(cliente.saldo_actual || 0);
        const limiteCredito = parseFloat(cliente.limite_credito || 0);

        // Bloqueo proactivo: Si ya excedió su límite antes de empezar, no puede consumir nada más
        if (deudaActual > limiteCredito) {
          const error = new Error(
            "No se puede realizar el consumo porque el cliente ya ha excedido su límite de crédito. Debe saldar su deuda primero."
          );
          error.statusCode = 400;
          error.detalles = {
            deudaActual: deudaActual,
            limiteCredito: limiteCredito,
            excedente: deudaActual - limiteCredito,
          };
          throw error;
        }

        const nuevaDeuda = deudaActual + total;

        if (nuevaDeuda > limiteCredito) {
          const error = new Error(
            "El consumo excede el límite de crédito disponible"
          );
          error.statusCode = 400;
          error.detalles = {
            deudaActual: deudaActual,
            limiteCredito: limiteCredito,
            creditoDisponible: Math.max(0, limiteCredito - deudaActual),
            totalConsumo: total,
            nuevaDeuda: nuevaDeuda,
          };
          throw error;
        }
      }

      // 6. Gestión de Factura (Todas las facturas se consideran aprobadas/cobradas)
      const estadoFactura = "COBRADA";
      let idFactura = null;

      // Eliminamos la unificación de pedidos pendientes ya que ahora todas nacen COBRADAS
      // Si no existe factura para unificar, crear nueva
      const [facturaResult] = await connection.execute(
        `INSERT INTO Factura (id_cliente, id_mesa, id_grupo, fecha, estado, total)
     VALUES (?, ?, ?, NOW(), ?, ?)`,
        [idCliente, idMesa || null, idGrupo || null, estadoFactura, total]
      );
      idFactura = facturaResult.insertId;

      // 7. Insertar los detalles de la factura
      for (const item of productosValidados) {
        await connection.execute(
          `INSERT INTO DetalleFactura (id_factura, id_producto, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
          [
            idFactura,
            item.idProducto,
            item.cantidad,
            item.precioUnitario,
            item.subtotal,
          ]
        );
      }

      // 8. Registrar movimiento en la cuenta del cliente
      const resumenProductos = productosValidados
        .map((p) => `${p.cantidad}x ${p.nombreProducto}`)
        .join(", ");

      const observacionesCompletas =
        observaciones ||
        `Consumo: ${resumenProductos}` +
          (idMesa ? ` (Mesa ${idMesa})` : "") +
          (idGrupo ? ` (Grupo ${idGrupo})` : "");

      // Obtener el ID del tipo de movimiento CONSUMO
      const [tipoMovResult] = await connection.execute(
        `SELECT id_tipo_mov FROM TipoMovimiento WHERE nombre = 'CONSUMO' LIMIT 1`
      );

      const idTipoMovConsumo =
        tipoMovResult.length > 0 ? tipoMovResult[0].id_tipo_mov : null;
      const idUsuario = req.user?.id || null; // Asumiendo que el middleware auth agrega user al req

      await connection.execute(
        `INSERT INTO MovimientoCuenta (id_cliente, id_tarjeta, fecha, monto, id_tipo_mov, id_factura, id_usuario, observaciones)
       VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`,
        [
          idCliente,
          cliente.id_tarjeta,
          total,
          idTipoMovConsumo,
          idFactura,
          idUsuario,
          observacionesCompletas,
        ]
      );

      // 9. Actualizar el saldo de la tarjeta según el tipo
      if (cliente.tipo_suscripcion === "PREPAGA") {
        // PREPAGA: Descontar del saldo disponible
        await connection.execute(
          `UPDATE Tarjeta SET saldo_actual = saldo_actual - ? WHERE id_tarjeta = ?`,
          [total, cliente.id_tarjeta]
        );
      } else if (cliente.tipo_suscripcion === "CREDITO") {
        // CRÉDITO: Aumentar la deuda (saldo positivo = deuda)
        await connection.execute(
          `UPDATE Tarjeta SET saldo_actual = saldo_actual + ? WHERE id_tarjeta = ?`,
          [total, cliente.id_tarjeta]
        );
      }

      // 10. Liberar mesa o grupo si corresponde
      let mesasLiberadasInfo = {
        tipo: null, // 'grupo' o 'mesa'
        id: null,
        mesas: [], // Lista de IDs de mesas liberadas
      };

      if (idGrupo) {
        // Obtener mesas del grupo antes de eliminarlo
        const [mesasDelGrupo] = await connection.execute(
          `SELECT id_mesa FROM MesaGrupo WHERE id_grupo = ?`,
          [idGrupo]
        );

        if (mesasDelGrupo.length > 0) {
          const idsMesas = mesasDelGrupo.map((m) => m.id_mesa);
          const placeholders = idsMesas.map(() => "?").join(", ");

          // Liberar las mesas
          await connection.execute(
            `UPDATE Mesa 
             SET estado = 'DISPONIBLE', id_cliente_actual = NULL 
             WHERE id_mesa IN (${placeholders})`,
            idsMesas
          );

          mesasLiberadasInfo = {
            tipo: "grupo",
            id: idGrupo,
            mesas: idsMesas,
          };
        }

        // Eliminar el grupo
        await connection.execute(
          `DELETE FROM GrupoMesas WHERE id_grupo = ?`,
          [idGrupo]
        );
      } else if (idMesa) {
        // Liberar la mesa individual
        await connection.execute(
          `UPDATE Mesa 
           SET estado = 'DISPONIBLE', id_cliente_actual = NULL 
           WHERE id_mesa = ?`,
          [idMesa]
        );

        mesasLiberadasInfo = {
          tipo: "mesa",
          id: idMesa,
          mesas: [idMesa],
        };
      }

      // 11. Obtener la factura completa con todos los detalles
      const [facturaCompleta] = await connection.execute(
        `SELECT f.id_factura, f.id_cliente, f.id_mesa, f.id_grupo,
              f.fecha, f.estado, f.total,
              c.nombre AS nombre_cliente,
              c.apellido AS apellido_cliente,
              c.email AS email_cliente,
              m.nombre AS nombre_mesa,
              g.nombre AS nombre_grupo
       FROM Factura f
       INNER JOIN Cliente c ON f.id_cliente = c.id_cliente
       LEFT JOIN Mesa m ON f.id_mesa = m.id_mesa
       LEFT JOIN GrupoMesas g ON f.id_grupo = g.id_grupo
       WHERE f.id_factura = ?`,
        [idFactura]
      );

      const [detallesFactura] = await connection.execute(
        `SELECT df.id_detalle, df.id_factura, df.id_producto,
              df.cantidad, df.precio_unitario, df.subtotal,
              p.nombre AS nombre_producto,
              p.descripcion AS descripcion_producto,
              p.foto_principal AS foto_principal_producto,
              cp.nombre AS nombre_categoria
       FROM DetalleFactura df
       INNER JOIN Producto p ON df.id_producto = p.id_producto
       LEFT JOIN CategoriaProducto cp ON cp.id_categoria = p.id_categoria
       WHERE df.id_factura = ?`,
        [idFactura]
      );

      // Obtener el nuevo saldo
      const [nuevoSaldo] = await connection.execute(
        `SELECT saldo_actual FROM Tarjeta WHERE id_tarjeta = ?`,
        [cliente.id_tarjeta]
      );

      return {
        factura: mapFacturaConDetalles(facturaCompleta[0], detallesFactura),
        resumen: {
          totalConsumo: total,
          cantidadProductos: productosValidados.length,
          tipoTarjeta: cliente.tipo_suscripcion,
          saldoAnterior: parseFloat(cliente.saldo_actual || 0),
          saldoActual: parseFloat(nuevoSaldo[0].saldo_actual),
        },
        mesasLiberadasInfo, // Retornar información para emitir eventos fuera del helper
      };
    });

    // Emitir eventos de WebSocket si hubo liberación de mesas
    if (result.mesasLiberadasInfo && result.mesasLiberadasInfo.tipo) {
      const { tipo, id, mesas } = result.mesasLiberadasInfo;

      if (tipo === "grupo") {
        emitGrupoDisuelto(id, mesas);
        emitMesasSeparadas({
          idGrupo: id,
          mesasSeparadas: mesas,
        });
      }

      // Emitir cambio de estado para cada mesa individualmente
      mesas.forEach((idMesa) => {
        emitMesaEstadoCambiado(idMesa, {
          estado: "DISPONIBLE",
          idClienteActual: null,
        });
      });

      // Actualización general para asegurar consistencia
      emitMesasActualizadas();
    }

    // Limpiar propiedad interna antes de enviar respuesta
    const responseData = { ...result };
    delete responseData.mesasLiberadasInfo;

    return enviarExito(res, responseData, "Consumo registrado exitosamente", 201);
  } catch (error) {
    if (error.statusCode) {
      return enviarError(
        res,
        error.statusCode,
        error.message,
        error.detalles ? { detalles: error.detalles } : {}
      );
    }
    console.error("Error al registrar consumo:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

/**
 * Registrar una recarga (solo para tarjetas PREPAGA)
 */
const registrarRecarga = async (req, res) => {
  try {
    const result = await withTransaction(async (connection) => {
      const { idCliente, monto, metodoPago, observaciones } = req.body;

      // Validaciones
      if (!idCliente || !monto || !metodoPago) {
        const error = new Error(
          "Debe proporcionar idCliente, monto y metodoPago"
        );
        error.statusCode = 400;
        throw error;
      }

      const montoRecarga = parseFloat(monto);
      if (montoRecarga <= 0) {
        const error = new Error("El monto debe ser mayor a 0");
        error.statusCode = 400;
        throw error;
      }

      // 1. Verificar cliente y tipo de tarjeta
      const [clienteRows] = await connection.execute(
        `SELECT c.id_cliente, c.nombre, c.apellido,
              t.id_tarjeta, t.saldo_actual,
              ts.nombre AS tipo_suscripcion
       FROM Cliente c
       LEFT JOIN Tarjeta t ON c.id_tarjeta = t.id_tarjeta
       LEFT JOIN TipoSuscripcion ts ON t.id_tipo_suscripcion = ts.id_tipo
       WHERE c.id_cliente = ?`,
        [idCliente]
      );

      if (clienteRows.length === 0) {
        const error = new Error(`No existe un cliente con ID ${idCliente}`);
        error.statusCode = 404;
        throw error;
      }

      const cliente = clienteRows[0];

      if (!cliente.id_tarjeta) {
        const error = new Error("El cliente no tiene una tarjeta asociada");
        error.statusCode = 400;
        throw error;
      }

      if (cliente.tipo_suscripcion !== "PREPAGA") {
        const error = new Error(
          "Solo se pueden recargar tarjetas de tipo PREPAGA"
        );
        error.statusCode = 400;
        error.detalles = { tipoActual: cliente.tipo_suscripcion };
        throw error;
      }

      // 2. Crear el movimiento de cuenta tipo RECARGA
      const observacionesCompletas =
        observaciones || `Recarga mediante ${metodoPago}`;

      // Obtener el ID del tipo de movimiento RECARGA
      const [tipoMovResult] = await connection.execute(
        `SELECT id_tipo_mov FROM TipoMovimiento WHERE nombre = 'RECARGA' LIMIT 1`
      );

      const idTipoMovRecarga =
        tipoMovResult.length > 0 ? tipoMovResult[0].id_tipo_mov : null;
      const idUsuario = req.user?.id || null; // Asumiendo que el middleware auth agrega user al req

      const [movCuentaResult] = await connection.execute(
        `INSERT INTO MovimientoCuenta (id_cliente, id_tarjeta, fecha, monto, id_tipo_mov, id_usuario, observaciones)
       VALUES (?, ?, NOW(), ?, ?, ?, ?)`,
        [
          idCliente,
          cliente.id_tarjeta,
          montoRecarga,
          idTipoMovRecarga,
          idUsuario,
          observacionesCompletas,
        ]
      );

      const idMovimientoCuenta = movCuentaResult.insertId;

      // 3. Actualizar el saldo de la tarjeta
      const saldoAnterior = parseFloat(cliente.saldo_actual || 0);

      await connection.execute(
        `UPDATE Tarjeta SET saldo_actual = saldo_actual + ? WHERE id_tarjeta = ?`,
        [montoRecarga, cliente.id_tarjeta]
      );

      const saldoNuevo = saldoAnterior + montoRecarga;

      // 4. Registrar el ingreso en la caja diaria si hay una caja abierta
      const [cajaAbierta] = await connection.execute(
        `SELECT id_caja FROM CajaDiaria WHERE fecha = CURDATE() AND estado = 'ABIERTA' LIMIT 1`
      );

      let movimientoCajaRegistrado = false;
      if (cajaAbierta.length > 0) {
        const idCaja = cajaAbierta[0].id_caja;

        // Obtener el ID del medio de pago
        const [medioPagoRows] = await connection.execute(
          `SELECT id_medio_pago FROM MedioPago WHERE nombre = ? LIMIT 1`,
          [metodoPago]
        );

        const idMedioPago =
          medioPagoRows.length > 0 ? medioPagoRows[0].id_medio_pago : null;

        // Registrar el movimiento en caja
        await connection.execute(
          `INSERT INTO MovimientoCaja (id_caja, id_cliente, tipo, id_medio_pago, monto, concepto, id_usuario, id_movimiento_cuenta, fecha)
         VALUES (?, ?, 'INGRESO', ?, ?, ?, ?, ?, NOW())`,
          [
            idCaja,
            idCliente,
            idMedioPago,
            montoRecarga,
            `Recarga de tarjeta - ${cliente.nombre} ${cliente.apellido}`,
            idUsuario,
            idMovimientoCuenta,
          ]
        );

        movimientoCajaRegistrado = true;
      }

      return {
        cliente: {
          id: cliente.id_cliente,
          nombre: `${cliente.nombre} ${cliente.apellido}`,
        },
        recarga: {
          monto: montoRecarga,
          metodoPago: metodoPago,
          fecha: new Date(),
        },
        saldos: {
          anterior: saldoAnterior,
          recargado: montoRecarga,
          actual: saldoNuevo,
        },
        movimientoCajaRegistrado: movimientoCajaRegistrado,
      };
    });

    return enviarExito(res, result, "Recarga realizada exitosamente", 201);
  } catch (error) {
    if (error.statusCode) {
      return enviarError(
        res,
        error.statusCode,
        error.message,
        error.detalles ? { detalles: error.detalles } : {}
      );
    }
    console.error("Error al registrar recarga:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

/**
 * Registrar un pago (para liquidar deudas de tarjetas CRÉDITO o facturas)
 */
const registrarPago = async (req, res) => {
  try {
    const result = await withTransaction(async (connection) => {
      const { idCliente, monto, metodoPago, idFactura, observaciones } = req.body;

      // Validaciones
      if (!idCliente || !monto || !metodoPago) {
        const error = new Error(
          "Debe proporcionar idCliente, monto y metodoPago"
        );
        error.statusCode = 400;
        throw error;
      }

      const montoPago = parseFloat(monto);
      if (montoPago <= 0) {
        const error = new Error("El monto debe ser mayor a 0");
        error.statusCode = 400;
        throw error;
      }

      // 1. Verificar cliente y tarjeta
      const [clienteRows] = await connection.execute(
        `SELECT c.id_cliente, c.nombre, c.apellido,
              t.id_tarjeta, t.saldo_actual,
              ts.nombre AS tipo_suscripcion
       FROM Cliente c
       LEFT JOIN Tarjeta t ON c.id_tarjeta = t.id_tarjeta
       LEFT JOIN TipoSuscripcion ts ON t.id_tipo_suscripcion = ts.id_tipo
       WHERE c.id_cliente = ?`,
        [idCliente]
      );

      if (clienteRows.length === 0) {
        const error = new Error(`No existe un cliente con ID ${idCliente}`);
        error.statusCode = 404;
        throw error;
      }

      const cliente = clienteRows[0];

      if (!cliente.id_tarjeta) {
        const error = new Error("El cliente no tiene una tarjeta asociada");
        error.statusCode = 400;
        throw error;
      }

      // 2. Si se especificó una factura, verificarla
      let facturaInfo = null;
      if (idFactura) {
        const [facturaRows] = await connection.execute(
          `SELECT id_factura, total, estado FROM Factura WHERE id_factura = ? AND id_cliente = ?`,
          [idFactura, idCliente]
        );

        if (facturaRows.length === 0) {
          const error = new Error(
            `No existe una factura con ID ${idFactura} para este cliente`
          );
          error.statusCode = 404;
          throw error;
        }

        facturaInfo = facturaRows[0];

        if (facturaInfo.estado === "COBRADA") {
          const error = new Error("La factura ya está cobrada");
          error.statusCode = 400;
          throw error;
        }

        if (facturaInfo.estado === "ANULADA") {
          const error = new Error("La factura está anulada");
          error.statusCode = 400;
          throw error;
        }
      }

      // 3. Crear el movimiento de cuenta tipo PAGO
      const observacionesCompletas =
        observaciones ||
        `Pago mediante ${metodoPago}` +
          (idFactura ? ` - Factura #${idFactura}` : "");

      // Obtener el ID del tipo de movimiento PAGO
      const [tipoMovResult] = await connection.execute(
        `SELECT id_tipo_mov FROM TipoMovimiento WHERE nombre = 'PAGO' LIMIT 1`
      );

      const idTipoMovPago =
        tipoMovResult.length > 0 ? tipoMovResult[0].id_tipo_mov : null;
      const idUsuario = req.user?.id || null; // Asumiendo que el middleware auth agrega user al req

      const [movCuentaResult] = await connection.execute(
        `INSERT INTO MovimientoCuenta (id_cliente, id_tarjeta, fecha, monto, id_tipo_mov, id_factura, id_usuario, observaciones)
       VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`,
        [
          idCliente,
          cliente.id_tarjeta,
          montoPago,
          idTipoMovPago,
          idFactura || null,
          idUsuario,
          observacionesCompletas,
        ]
      );

      const idMovimientoCuenta = movCuentaResult.insertId;

      // 4. Actualizar el saldo de la tarjeta (reducir deuda)
      const deudaAnterior = parseFloat(cliente.saldo_actual || 0);

      await connection.execute(
        `UPDATE Tarjeta SET saldo_actual = saldo_actual - ? WHERE id_tarjeta = ?`,
        [montoPago, cliente.id_tarjeta]
      );

      const deudaNueva = deudaAnterior - montoPago;

      // 5. Si se especificó una factura, actualizar su estado si corresponde
      let facturaActualizada = false;
      if (facturaInfo) {
        const totalFactura = parseFloat(facturaInfo.total);

        // Si el monto del pago es igual o mayor al total de la factura, marcarla como COBRADA
        if (montoPago >= totalFactura) {
          await connection.execute(
            `UPDATE Factura SET estado = 'COBRADA' WHERE id_factura = ?`,
            [idFactura]
          );
          facturaActualizada = true;
        }
      }

      // 6. Registrar el ingreso en la caja diaria si hay una caja abierta
      const [cajaAbierta] = await connection.execute(
        `SELECT id_caja FROM CajaDiaria WHERE fecha = CURDATE() AND estado = 'ABIERTA' LIMIT 1`
      );

      let movimientoCajaRegistrado = false;
      if (cajaAbierta.length > 0) {
        const idCaja = cajaAbierta[0].id_caja;

        // Obtener el ID del medio de pago
        const [medioPagoRows] = await connection.execute(
          `SELECT id_medio_pago FROM MedioPago WHERE nombre = ? LIMIT 1`,
          [metodoPago]
        );

        const idMedioPago =
          medioPagoRows.length > 0 ? medioPagoRows[0].id_medio_pago : null;

        // Registrar el movimiento en caja
        await connection.execute(
          `INSERT INTO MovimientoCaja (id_caja, id_cliente, tipo, id_medio_pago, monto, concepto, id_usuario, id_movimiento_cuenta, fecha)
         VALUES (?, ?, 'INGRESO', ?, ?, ?, ?, ?, NOW())`,
          [
            idCaja,
            idCliente,
            idMedioPago,
            montoPago,
            `Pago de deuda - ${cliente.nombre} ${cliente.apellido}`,
            idUsuario,
            idMovimientoCuenta,
          ]
        );

        movimientoCajaRegistrado = true;
      }

      return {
        cliente: {
          id: cliente.id_cliente,
          nombre: `${cliente.nombre} ${cliente.apellido}`,
          tipoTarjeta: cliente.tipo_suscripcion,
        },
        pago: {
          monto: montoPago,
          metodoPago: metodoPago,
          fecha: new Date(),
        },
        saldos: {
          deudaAnterior: deudaAnterior,
          montoPagado: montoPago,
          deudaActual: deudaNueva,
        },
        movimientoCajaRegistrado: movimientoCajaRegistrado,
        ...(facturaInfo && {
          factura: {
            id: facturaInfo.id_factura,
            total: parseFloat(facturaInfo.total),
            estadoAnterior: facturaInfo.estado,
            estadoActual: facturaActualizada ? "COBRADA" : facturaInfo.estado,
          },
        }),
      };
    });

    return enviarExito(res, result, "Pago registrado exitosamente", 201);
  } catch (error) {
    if (error.statusCode) {
      return enviarError(
        res,
        error.statusCode,
        error.message,
        error.detalles ? { detalles: error.detalles } : {}
      );
    }
    console.error("Error al registrar pago:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

module.exports = {
  registrarConsumo,
  registrarRecarga,
  registrarPago,
};
