const { promisePool } = require("../config/database");
const {
  normalizeNombre,
  mapMesaConGrupoRows,
} = require("../models/mesaGrupoModel");
const {
  emitMesaCreada,
  emitMesaActualizada,
  emitMesaEliminada,
  emitMesaEstadoCambiado,
} = require("../websocket"); // Importación simplificada desde el índice

const sanitizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const respondError = (res, status, message, extra = {}) => {
  return res.status(status).json({
    success: false,
    message,
    ...extra,
  });
};

const validarNombreUnico = async (nombre, idExcluir = null) => {
  const nombreNormalizado = normalizeNombre(nombre);

  if (!nombreNormalizado) {
    return { error: "El nombre de la mesa es obligatorio" };
  }

  const params = [nombreNormalizado];
  let query = "SELECT id_mesa FROM Mesa WHERE LOWER(nombre) = LOWER(?)";

  if (idExcluir) {
    query += " AND id_mesa <> ?";
    params.push(idExcluir);
  }

  query += " LIMIT 1";

  const [rows] = await promisePool.execute(query, params);

  if (rows.length > 0) {
    return { error: "Ya existe una mesa con el mismo nombre", status: 409 };
  }

  return { nombre: nombreNormalizado };
};

const obtenerMesaConGrupo = async (idMesa) => {
  const [rows] = await promisePool.execute(
    `SELECT id_mesa, nombre_mesa, estado_mesa, id_cliente_actual, posX, posY, id_grupo, nombre_grupo
       FROM vw_mesas_con_grupo
      WHERE id_mesa = ?`,
    [idMesa]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapMesaConGrupoRows(rows)[0];
};

const listarMesas = async (req, res) => {
  try {
    const [rows] = await promisePool.execute(
      `SELECT id_mesa, nombre_mesa, estado_mesa, id_cliente_actual, posX, posY, id_grupo, nombre_grupo
         FROM vw_mesas_con_grupo
        ORDER BY nombre_mesa`
    );

    const mesas = mapMesaConGrupoRows(rows);

    res.json({
      success: true,
      message: "Mesas obtenidas correctamente",
      data: mesas,
    });
  } catch (error) {
    console.error("Error al listar mesas:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const obtenerMesa = async (req, res) => {
  try {
    const idMesa = sanitizeId(req.params.id);

    if (!idMesa) {
      return respondError(res, 400, "El identificador de la mesa no es válido");
    }

    const mesa = await obtenerMesaConGrupo(idMesa);

    if (!mesa) {
      return respondError(res, 404, "Mesa no encontrada");
    }

    res.json({
      success: true,
      message: "Mesa obtenida correctamente",
      data: mesa,
    });
  } catch (error) {
    console.error("Error al obtener mesa:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const crearNuevaMesa = async (req, res) => {
  try {
    const { nombre } = req.body || {};

    const validacion = await validarNombreUnico(nombre);

    if (validacion.error) {
      return respondError(res, validacion.status ?? 400, validacion.error);
    }

    const [result] = await promisePool.execute(
      `INSERT INTO Mesa (nombre)
       VALUES (?)`,
      [validacion.nombre]
    );

    const mesa = await obtenerMesaConGrupo(result.insertId);

    emitMesaCreada(mesa);

    res.status(201).json({
      success: true,
      message: "Mesa creada correctamente",
      data: mesa,
    });
  } catch (error) {
    console.error("Error al crear mesa:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const actualizarMesaExistente = async (req, res) => {
  try {
    const idMesa = sanitizeId(req.params.id);

    if (!idMesa) {
      return respondError(res, 400, "El identificador de la mesa no es válido");
    }

    const { nombre } = req.body || {};

    if (nombre === undefined) {
      return respondError(
        res,
        400,
        "Debe proporcionar el nombre para actualizar la mesa"
      );
    }

    const validacion = await validarNombreUnico(nombre, idMesa);

    if (validacion.error) {
      return respondError(res, validacion.status ?? 400, validacion.error);
    }

    const [result] = await promisePool.execute(
      `UPDATE Mesa
          SET nombre = ?
        WHERE id_mesa = ?`,
      [validacion.nombre, idMesa]
    );

    if (result.affectedRows === 0) {
      return respondError(res, 404, "La mesa especificada no existe");
    }

    const mesa = await obtenerMesaConGrupo(idMesa);

    emitMesaActualizada(mesa);

    res.json({
      success: true,
      message: "Mesa actualizada correctamente",
      data: mesa,
    });
  } catch (error) {
    console.error("Error al actualizar mesa:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const eliminarMesaExistente = async (req, res) => {
  try {
    const idMesa = sanitizeId(req.params.id);

    if (!idMesa) {
      return respondError(res, 400, "El identificador de la mesa no es válido");
    }

    const connection = await promisePool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `DELETE FROM MesaGrupo
          WHERE id_mesa = ?`,
        [idMesa]
      );

      const [result] = await connection.execute(
        `DELETE FROM Mesa
          WHERE id_mesa = ?`,
        [idMesa]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return respondError(res, 404, "La mesa especificada no existe");
      }

      await connection.commit();
    } catch (transactionError) {
      await connection.rollback();
      console.error("Error en transacción al eliminar mesa:", transactionError);
      return respondError(res, 500, "Error interno del servidor", {
        error: transactionError.message,
      });
    } finally {
      connection.release();
    }

    emitMesaEliminada(idMesa);

    res.json({
      success: true,
      message: "Mesa eliminada correctamente",
      data: { id: idMesa },
    });
  } catch (error) {
    console.error("Error al eliminar mesa:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const cambiarEstadoMesa = async (req, res) => {
  try {
    const idMesa = sanitizeId(req.params.id);

    if (!idMesa) {
      return respondError(res, 400, "El identificador de la mesa no es válido");
    }

    const { estado, idCliente } = req.body || {};

    // Validar estado
    const estadosValidos = ['DISPONIBLE', 'OCUPADA', 'RESERVADA', 'FUERA_DE_SERVICIO'];
    
    if (!estado || !estadosValidos.includes(estado)) {
      return respondError(
        res, 
        400, 
        `El estado debe ser uno de: ${estadosValidos.join(', ')}`
      );
    }

    // Validar que la mesa exista
    const mesaExistente = await obtenerMesaConGrupo(idMesa);
    
    if (!mesaExistente) {
      return respondError(res, 404, "Mesa no encontrada");
    }

    // Si el estado es OCUPADA, debe tener un cliente
    // Si el estado es DISPONIBLE, limpiar el cliente
    const idClienteActual = estado === 'OCUPADA' ? (idCliente || null) : null;

    const [result] = await promisePool.execute(
      `UPDATE Mesa
          SET estado = ?,
              id_cliente_actual = ?
        WHERE id_mesa = ?`,
      [estado, idClienteActual, idMesa]
    );

    if (result.affectedRows === 0) {
      return respondError(res, 404, "No se pudo actualizar el estado de la mesa");
    }

    const mesa = await obtenerMesaConGrupo(idMesa);

    // Emitir evento WebSocket con el nuevo estado
    emitMesaEstadoCambiado(idMesa, {
      estado: mesa.estado,
      idClienteActual: mesa.idClienteActual,
    });

    res.json({
      success: true,
      message: "Estado de mesa actualizado correctamente",
      data: mesa,
    });
  } catch (error) {
    console.error("Error al cambiar estado de mesa:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const ocuparMesa = async (req, res) => {
  try {
    const idMesa = sanitizeId(req.params.id);

    if (!idMesa) {
      return respondError(res, 400, "El identificador de la mesa no es válido");
    }

    const { idCliente } = req.body || {};

    const mesaExistente = await obtenerMesaConGrupo(idMesa);
    
    if (!mesaExistente) {
      return respondError(res, 404, "Mesa no encontrada");
    }

    if (mesaExistente.estado === 'OCUPADA') {
      return respondError(res, 409, "La mesa ya está ocupada");
    }

    if (mesaExistente.estado === 'FUERA_DE_SERVICIO') {
      return respondError(res, 409, "La mesa está fuera de servicio");
    }

    const [result] = await promisePool.execute(
      `UPDATE Mesa
          SET estado = 'OCUPADA',
              id_cliente_actual = ?
        WHERE id_mesa = ?`,
      [idCliente || null, idMesa]
    );

    if (result.affectedRows === 0) {
      return respondError(res, 404, "No se pudo ocupar la mesa");
    }

    const mesa = await obtenerMesaConGrupo(idMesa);

    emitMesaEstadoCambiado(idMesa, {
      estado: 'OCUPADA',
      idClienteActual: mesa.idClienteActual,
    });

    res.json({
      success: true,
      message: "Mesa ocupada correctamente",
      data: mesa,
    });
  } catch (error) {
    console.error("Error al ocupar mesa:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const liberarMesa = async (req, res) => {
  try {
    const idMesa = sanitizeId(req.params.id);

    if (!idMesa) {
      return respondError(res, 400, "El identificador de la mesa no es válido");
    }

    const mesaExistente = await obtenerMesaConGrupo(idMesa);
    
    if (!mesaExistente) {
      return respondError(res, 404, "Mesa no encontrada");
    }

    const [result] = await promisePool.execute(
      `UPDATE Mesa
          SET estado = 'DISPONIBLE',
              id_cliente_actual = NULL
        WHERE id_mesa = ?`,
      [idMesa]
    );

    if (result.affectedRows === 0) {
      return respondError(res, 404, "No se pudo liberar la mesa");
    }

    const mesa = await obtenerMesaConGrupo(idMesa);

    emitMesaEstadoCambiado(idMesa, {
      estado: 'DISPONIBLE',
      idClienteActual: null,
    });

    res.json({
      success: true,
      message: "Mesa liberada correctamente",
      data: mesa,
    });
  } catch (error) {
    console.error("Error al liberar mesa:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const obtenerEstadisticasMesas = async (req, res) => {
  try {
    const [rows] = await promisePool.execute(
      `SELECT 
         estado,
         COUNT(*) as cantidad
       FROM Mesa
       GROUP BY estado`
    );

    const estadisticas = {
      disponibles: 0,
      ocupadas: 0,
      reservadas: 0,
      fueraDeServicio: 0,
      total: 0,
    };

    rows.forEach(row => {
      const cantidad = parseInt(row.cantidad);
      estadisticas.total += cantidad;
      
      switch (row.estado) {
        case 'DISPONIBLE':
          estadisticas.disponibles = cantidad;
          break;
        case 'OCUPADA':
          estadisticas.ocupadas = cantidad;
          break;
        case 'RESERVADA':
          estadisticas.reservadas = cantidad;
          break;
        case 'FUERA_DE_SERVICIO':
          estadisticas.fueraDeServicio = cantidad;
          break;
      }
    });

    res.json({
      success: true,
      message: "Estadísticas obtenidas correctamente",
      data: estadisticas,
    });
  } catch (error) {
    console.error("Error al obtener estadísticas de mesas:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const actualizarPosicionMesa = async (req, res) => {
  try {
    const idMesa = sanitizeId(req.params.id);
    const { posX, posY } = req.body || {};

    if (!idMesa) {
      return respondError(res, 400, "El identificador de la mesa no es válido");
    }

    // Validar que posX y posY existan y sean números
    if (posX === undefined || posY === undefined) {
      return respondError(res, 400, "Se requieren posX y posY");
    }

    if (typeof posX !== 'number' || typeof posY !== 'number') {
      return respondError(res, 400, "posX y posY deben ser números");
    }

    // Verificar que la mesa existe
    const [mesaExiste] = await promisePool.execute(
      'SELECT id_mesa FROM Mesa WHERE id_mesa = ?',
      [idMesa]
    );

    if (mesaExiste.length === 0) {
      return respondError(res, 404, "Mesa no encontrada");
    }

    // Actualizar posición
    await promisePool.execute(
      'UPDATE Mesa SET posX = ?, posY = ? WHERE id_mesa = ?',
      [posX, posY, idMesa]
    );

    // Obtener mesa actualizada
    const mesa = await obtenerMesaConGrupo(idMesa);

    const io = req.app.get('io');
    if (io) {
      io.to('mesas').emit('mesa:posicion-actualizada', {
        message: 'Posición de mesa actualizada',
        data: {
          idMesa,
          posX,
          posY,
          mesa
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: "Posición actualizada correctamente",
      data: { idMesa, posX, posY, mesa },
    });
  } catch (error) {
    console.error("Error al actualizar posición de mesa:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const getFacturaActivaMesa = async (req, res) => {
  try {
    const idMesa = sanitizeId(req.params.id);

    if (!idMesa) {
      return respondError(res, 400, "El identificador de la mesa no es válido");
    }

    // Verificar que la mesa existe
    const mesa = await obtenerMesaConGrupo(idMesa);

    if (!mesa) {
      return respondError(res, 404, "Mesa no encontrada");
    }

    // Buscar factura pendiente de la mesa
    const [facturaRows] = await promisePool.execute(
      `SELECT f.id_factura,
              f.id_cliente,
              f.id_mesa,
              f.id_grupo,
              f.fecha,
              f.estado,
              f.total,
              c.nombre AS nombre_cliente,
              c.apellido AS apellido_cliente,
              c.email AS email_cliente,
              m.nombre AS nombre_mesa,
              g.nombre AS nombre_grupo
       FROM Factura f
       INNER JOIN Cliente c ON c.id_cliente = f.id_cliente
       LEFT JOIN Mesa m ON m.id_mesa = f.id_mesa
       LEFT JOIN GrupoMesas g ON g.id_grupo = f.id_grupo
       WHERE f.id_mesa = ? AND f.estado = 'PENDIENTE'
       ORDER BY f.fecha DESC
       LIMIT 1`,
      [idMesa]
    );

    if (facturaRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No hay factura activa para esta mesa",
      });
    }

    // Obtener los detalles de la factura
    const { mapDetalleFacturaRows } = require("../helpers/detalleFacturaMapper");
    const { mapFacturaConDetalles } = require("../helpers/facturaMapper");
    
    const [detallesRows] = await promisePool.execute(
      `SELECT df.id_detalle,
              df.id_factura,
              df.id_producto,
              df.cantidad,
              df.precio_unitario,
              df.subtotal,
              p.nombre AS nombre_producto,
              p.descripcion AS descripcion_producto,
              p.foto_principal AS foto_principal_producto,
              cp.nombre AS nombre_categoria
       FROM DetalleFactura df
       INNER JOIN Producto p ON p.id_producto = df.id_producto
       LEFT JOIN CategoriaProducto cp ON cp.id_categoria = p.id_categoria
       WHERE df.id_factura = ?
       ORDER BY df.id_detalle`,
      [facturaRows[0].id_factura]
    );

    const factura = mapFacturaConDetalles(facturaRows[0], detallesRows);

    res.json({
      success: true,
      data: factura,
      message: "Factura activa obtenida correctamente",
    });
  } catch (error) {
    console.error("Error al obtener factura activa de la mesa:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

module.exports = {
  listarMesas,
  obtenerMesa,
  crearNuevaMesa,
  actualizarMesaExistente,
  eliminarMesaExistente,
  cambiarEstadoMesa,
  ocuparMesa,
  liberarMesa,
  obtenerEstadisticasMesas,
  actualizarPosicionMesa,
  getFacturaActivaMesa,
};
