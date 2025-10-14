const { promisePool } = require("../config/database");
const {
  mapFacturaConDetalles,
} = require("../helpers/facturaMapper");

/**
 * Registrar un consumo de productos y generar factura automáticamente
 */
const registrarConsumo = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { idCliente, productos, idMesa, idGrupo, observaciones } = req.body;

    // Validaciones básicas
    if (!idCliente) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "El ID del cliente es obligatorio",
      });
    }

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar al menos un producto",
      });
    }

    // Validar que no se envíen ambos: mesa y grupo
    if (idMesa && idGrupo) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "No puede especificar tanto mesa individual como grupo de mesas",
      });
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
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: `No existe un cliente con ID ${idCliente}`,
      });
    }

    const cliente = clienteRows[0];

    if (!cliente.id_tarjeta) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "El cliente no tiene una tarjeta asociada",
      });
    }

    // 2. Verificar la mesa si se especificó
    if (idMesa) {
      const [mesaRows] = await connection.execute(
        `SELECT id_mesa, nombre FROM Mesa WHERE id_mesa = ?`,
        [idMesa]
      );

      if (mesaRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `No existe una mesa con ID ${idMesa}`,
        });
      }
    }

    // 3. Verificar el grupo de mesas si se especificó
    if (idGrupo) {
      const [grupoRows] = await connection.execute(
        `SELECT id_grupo, nombre FROM GrupoMesas WHERE id_grupo = ?`,
        [idGrupo]
      );

      if (grupoRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `No existe un grupo de mesas con ID ${idGrupo}`,
        });
      }
    }

    // 4. Validar todos los productos y calcular el total
    let total = 0;
    const productosValidados = [];

    for (const item of productos) {
      if (!item.idProducto || !item.cantidad) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Cada producto debe tener idProducto y cantidad",
        });
      }

      const [productoRows] = await connection.execute(
        `SELECT id_producto, nombre, precio_unitario 
         FROM Producto 
         WHERE id_producto = ?`,
        [item.idProducto]
      );

      if (productoRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `No existe el producto con ID ${item.idProducto}`,
        });
      }

      const producto = productoRows[0];
      const precioUnitario = item.precioUnitario || producto.precio_unitario;
      const cantidad = parseInt(item.cantidad);

      if (cantidad <= 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "La cantidad debe ser mayor a 0",
        });
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
      const saldoActual = parseFloat(cliente.saldo_actual || 0);
      
      if (saldoActual < total) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Saldo insuficiente para realizar el consumo",
          detalles: {
            saldoActual: saldoActual,
            totalConsumo: total,
            faltante: total - saldoActual,
          },
        });
      }
    } else if (cliente.tipo_suscripcion === "CREDITO") {
      const deudaActual = parseFloat(cliente.saldo_actual || 0);
      const limiteCredito = parseFloat(cliente.limite_credito || 0);
      const nuevaDeuda = deudaActual + total;

      if (nuevaDeuda > limiteCredito) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "El consumo excede el límite de crédito disponible",
          detalles: {
            deudaActual: deudaActual,
            limiteCredito: limiteCredito,
            creditoDisponible: limiteCredito - deudaActual,
            totalConsumo: total,
          },
        });
      }
    }

    // 6. Crear la factura
    const [facturaResult] = await connection.execute(
      `INSERT INTO Factura (id_cliente, id_mesa, id_grupo, fecha, estado, total)
       VALUES (?, ?, ?, NOW(), 'PENDIENTE', ?)`,
      [idCliente, idMesa || null, idGrupo || null, total]
    );

    const idFactura = facturaResult.insertId;

    // 7. Insertar los detalles de la factura
    for (const item of productosValidados) {
      await connection.execute(
        `INSERT INTO DetalleFactura (id_factura, id_producto, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [idFactura, item.idProducto, item.cantidad, item.precioUnitario, item.subtotal]
      );
    }

    // 8. Registrar movimiento en la cuenta del cliente
    const observacionesCompletas = observaciones || 
      `Consumo de ${productosValidados.length} producto(s)` +
      (idMesa ? ` en mesa ${idMesa}` : '') +
      (idGrupo ? ` en grupo ${idGrupo}` : '');

    // Obtener el ID del tipo de movimiento CONSUMO
    const [tipoMovResult] = await connection.execute(
      `SELECT id_tipo_mov FROM TipoMovimiento WHERE nombre = 'CONSUMO' LIMIT 1`
    );

    const idTipoMovConsumo = tipoMovResult.length > 0 ? tipoMovResult[0].id_tipo_mov : null;
    const idUsuario = req.user?.id || null; // Asumiendo que el middleware auth agrega user al req

    await connection.execute(
      `INSERT INTO MovimientoCuenta (id_cliente, id_tarjeta, fecha, monto, tipo_movimiento, id_tipo_mov, id_factura, id_usuario, observaciones)
       VALUES (?, ?, NOW(), ?, 'CONSUMO', ?, ?, ?, ?)`,
      [idCliente, cliente.id_tarjeta, total, idTipoMovConsumo, idFactura, idUsuario, observacionesCompletas]
    );

    // 9. Actualizar el saldo de la tarjeta según el tipo
    if (cliente.tipo_suscripcion === "PREPAGA") {
      // Descontar del saldo
      await connection.execute(
        `UPDATE Tarjeta SET saldo_actual = saldo_actual - ? WHERE id_tarjeta = ?`,
        [total, cliente.id_tarjeta]
      );
    } else if (cliente.tipo_suscripcion === "CREDITO") {
      // Aumentar la deuda
      await connection.execute(
        `UPDATE Tarjeta SET saldo_actual = saldo_actual + ? WHERE id_tarjeta = ?`,
        [total, cliente.id_tarjeta]
      );
    }

    // 10. Obtener la factura completa con todos los detalles
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

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Consumo registrado exitosamente",
      data: {
        factura: mapFacturaConDetalles(facturaCompleta[0], detallesFactura),
        resumen: {
          totalConsumo: total,
          cantidadProductos: productosValidados.length,
          tipoTarjeta: cliente.tipo_suscripcion,
          saldoAnterior: parseFloat(cliente.saldo_actual || 0),
          saldoActual: parseFloat(nuevoSaldo[0].saldo_actual),
        },
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al registrar consumo:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Registrar una recarga (solo para tarjetas PREPAGA)
 */
const registrarRecarga = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { idCliente, monto, metodoPago, observaciones } = req.body;

    // Validaciones
    if (!idCliente || !monto || !metodoPago) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar idCliente, monto y metodoPago",
      });
    }

    const montoRecarga = parseFloat(monto);
    if (montoRecarga <= 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "El monto debe ser mayor a 0",
      });
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
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: `No existe un cliente con ID ${idCliente}`,
      });
    }

    const cliente = clienteRows[0];

    if (!cliente.id_tarjeta) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "El cliente no tiene una tarjeta asociada",
      });
    }

    if (cliente.tipo_suscripcion !== "PREPAGA") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Solo se pueden recargar tarjetas de tipo PREPAGA",
        tipoActual: cliente.tipo_suscripcion,
      });
    }

    // 2. Crear el movimiento de cuenta tipo RECARGA
    const observacionesCompletas = observaciones || 
      `Recarga mediante ${metodoPago}`;

    // Obtener el ID del tipo de movimiento RECARGA
    const [tipoMovResult] = await connection.execute(
      `SELECT id_tipo_mov FROM TipoMovimiento WHERE nombre = 'RECARGA' LIMIT 1`
    );

    const idTipoMovRecarga = tipoMovResult.length > 0 ? tipoMovResult[0].id_tipo_mov : null;
    const idUsuario = req.user?.id || null; // Asumiendo que el middleware auth agrega user al req

    await connection.execute(
      `INSERT INTO MovimientoCuenta (id_cliente, id_tarjeta, fecha, monto, tipo_movimiento, id_tipo_mov, id_usuario, observaciones)
       VALUES (?, ?, NOW(), ?, 'RECARGA', ?, ?, ?)`,
      [idCliente, cliente.id_tarjeta, montoRecarga, idTipoMovRecarga, idUsuario, observacionesCompletas]
    );

    // 3. Actualizar el saldo de la tarjeta
    const saldoAnterior = parseFloat(cliente.saldo_actual || 0);
    
    await connection.execute(
      `UPDATE Tarjeta SET saldo_actual = saldo_actual + ? WHERE id_tarjeta = ?`,
      [montoRecarga, cliente.id_tarjeta]
    );

    const saldoNuevo = saldoAnterior + montoRecarga;

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Recarga realizada exitosamente",
      data: {
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
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al registrar recarga:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Registrar un pago (para liquidar deudas de tarjetas CRÉDITO o facturas)
 */
const registrarPago = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { idCliente, monto, metodoPago, idFactura, observaciones } = req.body;

    // Validaciones
    if (!idCliente || !monto || !metodoPago) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar idCliente, monto y metodoPago",
      });
    }

    const montoPago = parseFloat(monto);
    if (montoPago <= 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "El monto debe ser mayor a 0",
      });
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
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: `No existe un cliente con ID ${idCliente}`,
      });
    }

    const cliente = clienteRows[0];

    if (!cliente.id_tarjeta) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "El cliente no tiene una tarjeta asociada",
      });
    }

    // 2. Si se especificó una factura, verificarla
    let facturaInfo = null;
    if (idFactura) {
      const [facturaRows] = await connection.execute(
        `SELECT id_factura, total, estado FROM Factura WHERE id_factura = ? AND id_cliente = ?`,
        [idFactura, idCliente]
      );

      if (facturaRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: `No existe una factura con ID ${idFactura} para este cliente`,
        });
      }

      facturaInfo = facturaRows[0];

      if (facturaInfo.estado === "COBRADA") {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "La factura ya está cobrada",
        });
      }

      if (facturaInfo.estado === "ANULADA") {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "La factura está anulada",
        });
      }
    }

    // 3. Crear el movimiento de cuenta tipo PAGO
    const observacionesCompletas = observaciones || 
      `Pago mediante ${metodoPago}` +
      (idFactura ? ` - Factura #${idFactura}` : '');

    // Obtener el ID del tipo de movimiento PAGO
    const [tipoMovResult] = await connection.execute(
      `SELECT id_tipo_mov FROM TipoMovimiento WHERE nombre = 'PAGO' LIMIT 1`
    );

    const idTipoMovPago = tipoMovResult.length > 0 ? tipoMovResult[0].id_tipo_mov : null;
    const idUsuario = req.user?.id || null; // Asumiendo que el middleware auth agrega user al req

    await connection.execute(
      `INSERT INTO MovimientoCuenta (id_cliente, id_tarjeta, fecha, monto, tipo_movimiento, id_tipo_mov, id_factura, id_usuario, observaciones)
       VALUES (?, ?, NOW(), ?, 'PAGO', ?, ?, ?, ?)`,
      [idCliente, cliente.id_tarjeta, montoPago, idTipoMovPago, idFactura || null, idUsuario, observacionesCompletas]
    );

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

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Pago registrado exitosamente",
      data: {
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
        ...(facturaInfo && {
          factura: {
            id: facturaInfo.id_factura,
            total: parseFloat(facturaInfo.total),
            estadoAnterior: facturaInfo.estado,
            estadoActual: facturaActualizada ? "COBRADA" : facturaInfo.estado,
          },
        }),
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al registrar pago:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  registrarConsumo,
  registrarRecarga,
  registrarPago,
};
