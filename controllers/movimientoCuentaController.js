const { promisePool } = require("../config/database");
const {
  mapMovimientoCuentaRow,
  mapMovimientoCuentaRows,
} = require("../helpers/movimientoCuentaMapper");

/**
 * Obtener todos los movimientos de cuenta
 */
const getMovimientosCuenta = async (req, res) => {
  try {
    const [rows] = await promisePool.execute(
      `SELECT mc.id_movimiento,
              mc.id_cliente,
              mc.id_tarjeta,
              mc.fecha,
              mc.monto,
              mc.tipo_movimiento,
              mc.id_tipo_mov,
              mc.id_factura,
              mc.id_mov_caja,
              mc.id_usuario,
              mc.observaciones,
              c.nombre AS nombre_cliente,
              c.apellido AS apellido_cliente,
              c.email AS email_cliente,
              t.uuid AS tarjeta_uuid,
              t.saldo_actual AS tarjeta_saldo,
              tm.nombre AS tipo_movimiento_nombre,
              f.total AS total_factura,
              f.estado AS estado_factura,
              u.nombre_usuario AS usuario_nombre
       FROM MovimientoCuenta mc
       INNER JOIN Cliente c ON c.id_cliente = mc.id_cliente
       LEFT JOIN Tarjeta t ON t.id_tarjeta = mc.id_tarjeta
       LEFT JOIN TipoMovimiento tm ON tm.id_tipo_mov = mc.id_tipo_mov
       LEFT JOIN Factura f ON f.id_factura = mc.id_factura
       LEFT JOIN Usuario u ON u.id_usuario = mc.id_usuario
       ORDER BY mc.fecha DESC`
    );

    res.json({
      success: true,
      data: mapMovimientoCuentaRows(rows),
      message: "Movimientos de cuenta obtenidos correctamente",
    });
  } catch (error) {
    console.error("Error al obtener movimientos de cuenta:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Obtener un movimiento de cuenta por ID
 */
const getMovimientoCuentaPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await promisePool.execute(
      `SELECT mc.id_movimiento,
              mc.id_cliente,
              mc.id_tarjeta,
              mc.fecha,
              mc.monto,
              mc.tipo_movimiento,
              mc.id_tipo_mov,
              mc.id_factura,
              mc.id_mov_caja,
              mc.id_usuario,
              mc.observaciones,
              c.nombre AS nombre_cliente,
              c.apellido AS apellido_cliente,
              c.email AS email_cliente,
              t.uuid AS tarjeta_uuid,
              t.saldo_actual AS tarjeta_saldo,
              tm.nombre AS tipo_movimiento_nombre,
              f.total AS total_factura,
              f.estado AS estado_factura,
              u.nombre_usuario AS usuario_nombre
       FROM MovimientoCuenta mc
       INNER JOIN Cliente c ON c.id_cliente = mc.id_cliente
       LEFT JOIN Tarjeta t ON t.id_tarjeta = mc.id_tarjeta
       LEFT JOIN TipoMovimiento tm ON tm.id_tipo_mov = mc.id_tipo_mov
       LEFT JOIN Factura f ON f.id_factura = mc.id_factura
       LEFT JOIN Usuario u ON u.id_usuario = mc.id_usuario
       WHERE mc.id_movimiento = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Movimiento de cuenta no encontrado",
      });
    }

    res.json({
      success: true,
      data: mapMovimientoCuentaRow(rows[0]),
      message: "Movimiento de cuenta obtenido correctamente",
    });
  } catch (error) {
    console.error("Error al obtener movimiento de cuenta:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Obtener movimientos de cuenta de un cliente específico
 */
const getMovimientosPorCliente = async (req, res) => {
  try {
    const { idCliente } = req.params;
    const { tipo, desde, hasta } = req.query;

    let query = `
      SELECT mc.id_movimiento,
              mc.id_cliente,
              mc.id_tarjeta,
              mc.fecha,
              mc.monto,
              mc.tipo_movimiento,
              mc.id_tipo_mov,
              mc.id_factura,
              mc.id_mov_caja,
              mc.id_usuario,
              mc.observaciones,
              c.nombre AS nombre_cliente,
              c.apellido AS apellido_cliente,
              c.email AS email_cliente,
              t.uuid AS tarjeta_uuid,
              t.saldo_actual AS tarjeta_saldo,
              tm.nombre AS tipo_movimiento_nombre,
              f.total AS total_factura,
              f.estado AS estado_factura,
              u.nombre_usuario AS usuario_nombre
       FROM MovimientoCuenta mc
       INNER JOIN Cliente c ON c.id_cliente = mc.id_cliente
       LEFT JOIN Tarjeta t ON t.id_tarjeta = mc.id_tarjeta
       LEFT JOIN TipoMovimiento tm ON tm.id_tipo_mov = mc.id_tipo_mov
       LEFT JOIN Factura f ON f.id_factura = mc.id_factura
       LEFT JOIN Usuario u ON u.id_usuario = mc.id_usuario
       WHERE mc.id_cliente = ?
    `;

    const params = [idCliente];

    // Filtrar por tipo de movimiento si se especifica
    if (tipo && ["CONSUMO", "RECARGA", "PAGO"].includes(tipo.toUpperCase())) {
      query += ` AND mc.tipo_movimiento = ?`;
      params.push(tipo.toUpperCase());
    }

    // Filtrar por rango de fechas
    if (desde) {
      query += ` AND mc.fecha >= ?`;
      params.push(desde);
    }

    if (hasta) {
      query += ` AND mc.fecha <= ?`;
      params.push(hasta);
    }

    query += ` ORDER BY mc.fecha DESC`;

    const [rows] = await promisePool.execute(query, params);

    res.json({
      success: true,
      data: mapMovimientoCuentaRows(rows),
      message: "Movimientos de cuenta del cliente obtenidos correctamente",
    });
  } catch (error) {
    console.error("Error al obtener movimientos del cliente:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Obtener resumen de cuenta de un cliente (saldo, totales por tipo)
 */
const getResumenCuentaCliente = async (req, res) => {
  try {
    const { idCliente } = req.params;

    // Verificar que el cliente existe
    const [clienteRows] = await promisePool.execute(
      `SELECT c.id_cliente, c.nombre, c.apellido, c.email,
              t.saldo_actual, t.uuid AS tarjeta_uuid
       FROM Cliente c
       LEFT JOIN Tarjeta t ON t.id_tarjeta = c.id_tarjeta
       WHERE c.id_cliente = ?`,
      [idCliente]
    );

    if (clienteRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    // Obtener totales por tipo de movimiento
    const [totalesRows] = await promisePool.execute(
      `SELECT tipo_movimiento,
              COUNT(*) as cantidad,
              SUM(monto) as total
       FROM MovimientoCuenta
       WHERE id_cliente = ?
       GROUP BY tipo_movimiento`,
      [idCliente]
    );

    // Obtener últimos movimientos
    const [ultimosMovimientos] = await promisePool.execute(
      `SELECT mc.id_movimiento,
              mc.id_cliente,
              mc.id_tarjeta,
              mc.fecha,
              mc.monto,
              mc.tipo_movimiento,
              mc.id_tipo_mov,
              mc.id_factura,
              mc.id_mov_caja,
              mc.id_usuario,
              mc.observaciones,
              t.uuid AS tarjeta_uuid,
              tm.nombre AS tipo_movimiento_nombre,
              u.nombre_usuario AS usuario_nombre
       FROM MovimientoCuenta mc
       LEFT JOIN Tarjeta t ON t.id_tarjeta = mc.id_tarjeta
       LEFT JOIN TipoMovimiento tm ON tm.id_tipo_mov = mc.id_tipo_mov
       LEFT JOIN Usuario u ON u.id_usuario = mc.id_usuario
       WHERE mc.id_cliente = ?
       ORDER BY mc.fecha DESC
       LIMIT 10`,
      [idCliente]
    );

    const cliente = clienteRows[0];
    const resumen = {
      cliente: {
        id: cliente.id_cliente,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        email: cliente.email,
        saldoActual: cliente.saldo_actual ? parseFloat(cliente.saldo_actual) : 0,
        tarjetaUuid: cliente.tarjeta_uuid || null,
      },
      totalesPorTipo: totalesRows.map((row) => ({
        tipo: row.tipo_movimiento,
        cantidad: row.cantidad,
        total: parseFloat(row.total),
      })),
      ultimosMovimientos: mapMovimientoCuentaRows(ultimosMovimientos),
    };

    res.json({
      success: true,
      data: resumen,
      message: "Resumen de cuenta obtenido correctamente",
    });
  } catch (error) {
    console.error("Error al obtener resumen de cuenta:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Obtener movimientos de cuenta por tarjeta
 */
const getMovimientosPorTarjeta = async (req, res) => {
  try {
    const { idTarjeta } = req.params;
    const { tipo, desde, hasta } = req.query;

    let query = `
      SELECT mc.id_movimiento,
              mc.id_cliente,
              mc.id_tarjeta,
              mc.fecha,
              mc.monto,
              mc.tipo_movimiento,
              mc.id_tipo_mov,
              mc.id_factura,
              mc.id_mov_caja,
              mc.id_usuario,
              mc.observaciones,
              c.nombre AS nombre_cliente,
              c.apellido AS apellido_cliente,
              c.email AS email_cliente,
              t.uuid AS tarjeta_uuid,
              t.saldo_actual AS tarjeta_saldo,
              tm.nombre AS tipo_movimiento_nombre,
              f.total AS total_factura,
              f.estado AS estado_factura,
              u.nombre_usuario AS usuario_nombre
       FROM MovimientoCuenta mc
       INNER JOIN Cliente c ON c.id_cliente = mc.id_cliente
       INNER JOIN Tarjeta t ON t.id_tarjeta = mc.id_tarjeta
       LEFT JOIN TipoMovimiento tm ON tm.id_tipo_mov = mc.id_tipo_mov
       LEFT JOIN Factura f ON f.id_factura = mc.id_factura
       LEFT JOIN Usuario u ON u.id_usuario = mc.id_usuario
       WHERE mc.id_tarjeta = ?
    `;

    const params = [idTarjeta];

    // Filtrar por tipo de movimiento si se especifica
    if (tipo && ["CONSUMO", "RECARGA", "PAGO"].includes(tipo.toUpperCase())) {
      query += ` AND mc.tipo_movimiento = ?`;
      params.push(tipo.toUpperCase());
    }

    // Filtrar por rango de fechas
    if (desde) {
      query += ` AND mc.fecha >= ?`;
      params.push(desde);
    }

    if (hasta) {
      query += ` AND mc.fecha <= ?`;
      params.push(hasta);
    }

    query += ` ORDER BY mc.fecha DESC`;

    const [rows] = await promisePool.execute(query, params);

    res.json({
      success: true,
      data: mapMovimientoCuentaRows(rows),
      message: "Movimientos de cuenta de la tarjeta obtenidos correctamente",
    });
  } catch (error) {
    console.error("Error al obtener movimientos de la tarjeta:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Obtener movimientos de cuenta por tipo de movimiento
 */
const getMovimientosPorTipo = async (req, res) => {
  try {
    const { idTipoMov } = req.params;
    const { desde, hasta } = req.query;

    let query = `
      SELECT mc.id_movimiento,
              mc.id_cliente,
              mc.id_tarjeta,
              mc.fecha,
              mc.monto,
              mc.tipo_movimiento,
              mc.id_tipo_mov,
              mc.id_factura,
              mc.id_mov_caja,
              mc.id_usuario,
              mc.observaciones,
              c.nombre AS nombre_cliente,
              c.apellido AS apellido_cliente,
              c.email AS email_cliente,
              t.uuid AS tarjeta_uuid,
              t.saldo_actual AS tarjeta_saldo,
              tm.nombre AS tipo_movimiento_nombre,
              f.total AS total_factura,
              f.estado AS estado_factura,
              u.nombre_usuario AS usuario_nombre
       FROM MovimientoCuenta mc
       INNER JOIN Cliente c ON c.id_cliente = mc.id_cliente
       INNER JOIN TipoMovimiento tm ON tm.id_tipo_mov = mc.id_tipo_mov
       LEFT JOIN Tarjeta t ON t.id_tarjeta = mc.id_tarjeta
       LEFT JOIN Factura f ON f.id_factura = mc.id_factura
       LEFT JOIN Usuario u ON u.id_usuario = mc.id_usuario
       WHERE mc.id_tipo_mov = ?
    `;

    const params = [idTipoMov];

    // Filtrar por rango de fechas
    if (desde) {
      query += ` AND mc.fecha >= ?`;
      params.push(desde);
    }

    if (hasta) {
      query += ` AND mc.fecha <= ?`;
      params.push(hasta);
    }

    query += ` ORDER BY mc.fecha DESC`;

    const [rows] = await promisePool.execute(query, params);

    res.json({
      success: true,
      data: mapMovimientoCuentaRows(rows),
      message: "Movimientos de cuenta por tipo obtenidos correctamente",
    });
  } catch (error) {
    console.error("Error al obtener movimientos por tipo:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

module.exports = {
  getMovimientosCuenta,
  getMovimientoCuentaPorId,
  getMovimientosPorCliente,
  getResumenCuentaCliente,
  getMovimientosPorTarjeta,
  getMovimientosPorTipo,
};
