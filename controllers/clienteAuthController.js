const { promisePool } = require("../config/database");
const asyncHandler = require("../helpers/asyncHandler");

/**
 * GET /api/auth-cliente/me
 * Obtiene el perfil completo del cliente autenticado
 */
const getPerfilCliente = asyncHandler(async (req, res) => {
  const clienteId = req.cliente.id;

  const [rows] = await promisePool.execute(
    `SELECT 
      c.id_cliente,
      c.nombre,
      c.apellido,
      c.email,
      c.telefono,
      c.foto_perfil,
      c.id_tarjeta,
      t.uuid as tarjeta_uuid,
      t.saldo_actual as tarjeta_saldo,
      t.id_nivel_suscripcion,
      t.id_tipo_suscripcion,
      t.estado as tarjeta_estado,
      t.fecha_creacion as tarjeta_fecha_creacion,
      ns.nombre as nivel_suscripcion_nombre,
      ts.nombre as tipo_suscripcion
     FROM Cliente c
     LEFT JOIN Tarjeta t ON c.id_tarjeta = t.id_tarjeta
     LEFT JOIN NivelSuscripcion ns ON t.id_nivel_suscripcion = ns.id_nivel
     LEFT JOIN TipoSuscripcion ts ON t.id_tipo_suscripcion = ts.id_tipo
     WHERE c.id_cliente = ?`,
    [clienteId]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Cliente no encontrado",
    });
  }

  const cliente = rows[0];

  res.json({
    success: true,
    data: {
      id: cliente.id_cliente,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      email: cliente.email,
      telefono: cliente.telefono,
      fotoPerfil: cliente.foto_perfil,
      saldoActual: cliente.tarjeta_saldo ? parseFloat(cliente.tarjeta_saldo) : 0,
      nivelSuscripcion: cliente.id_nivel_suscripcion ? {
        id: cliente.id_nivel_suscripcion,
        nombre: cliente.nivel_suscripcion_nombre,
      } : null,
      tipoSuscripcion: cliente.id_tipo_suscripcion ? {
        id: cliente.id_tipo_suscripcion,
        tipo: cliente.tipo_suscripcion,
      } : null,
      tarjeta: cliente.id_tarjeta ? {
        id: cliente.id_tarjeta,
        uuid: cliente.tarjeta_uuid,
        saldoActual: parseFloat(cliente.tarjeta_saldo),
        estado: cliente.tarjeta_estado,
        fechaCreacion: cliente.tarjeta_fecha_creacion,
      } : null,
    },
  });
});

/**
 * GET /api/auth-cliente/resumen
 * Obtiene el resumen de cuenta del cliente (saldo, totales por tipo)
 */
const getResumenCuenta = asyncHandler(async (req, res) => {
  const clienteId = req.cliente.id;

  // Obtener saldo actual de la tarjeta del cliente
  const [saldoRows] = await promisePool.execute(
    `SELECT t.saldo_actual, t.estado 
     FROM Cliente c
     INNER JOIN Tarjeta t ON c.id_tarjeta = t.id_tarjeta
     WHERE c.id_cliente = ?`,
    [clienteId]
  );

  const saldoActual = saldoRows.length > 0 ? parseFloat(saldoRows[0].saldo_actual) : 0;
  const estadoTarjeta = saldoRows.length > 0 ? saldoRows[0].estado : null;

  // Obtener total de movimientos
  const [countRows] = await promisePool.execute(
    `SELECT COUNT(*) as total
     FROM MovimientoCuenta
     WHERE id_cliente = ?`,
    [clienteId]
  );

  // Obtener totales por tipo de movimiento
  const [totalesRows] = await promisePool.execute(
    `SELECT 
      tm.nombre as tipo,
      COUNT(*) as cantidad,
      SUM(mc.monto) as total
     FROM MovimientoCuenta mc
     INNER JOIN TipoMovimiento tm ON mc.id_tipo_mov = tm.id_tipo_mov
     WHERE mc.id_cliente = ?
     GROUP BY tm.id_tipo_mov, tm.nombre
     ORDER BY total DESC`,
    [clienteId]
  );

  res.json({
    success: true,
    data: {
      saldoActual,
      estadoTarjeta,
      totalMovimientos: countRows[0].total,
      totalesPorTipo: totalesRows.map(row => ({
        tipo: row.tipo,
        cantidad: row.cantidad,
        total: parseFloat(row.total),
      })),
    },
  });
});

/**
 * GET /api/auth-cliente/movimientos
 * Obtiene el historial de movimientos del cliente con paginación
 */
const getMovimientos = asyncHandler(async (req, res) => {
  const clienteId = req.cliente.id;
  const { limit = 10, offset = 0 } = req.query;
  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);

  // Obtener movimientos con paginación
  const [movimientos] = await promisePool.execute(
    `SELECT 
      mc.id_movimiento,
      mc.fecha,
      mc.monto,
      mc.observaciones,
      tm.id_tipo_mov,
      tm.nombre as tipo_movimiento_nombre,
      f.id_factura,
      f.total as factura_total,
      f.estado as factura_estado
     FROM MovimientoCuenta mc
     LEFT JOIN TipoMovimiento tm ON mc.id_tipo_mov = tm.id_tipo_mov
     LEFT JOIN Factura f ON mc.id_factura = f.id_factura
     WHERE mc.id_cliente = ?
     ORDER BY mc.fecha DESC
     LIMIT ? OFFSET ?`,
    [clienteId, limitNum, offsetNum]
  );

  // Contar total de registros
  const [countRows] = await promisePool.execute(
    `SELECT COUNT(*) as total
     FROM MovimientoCuenta
     WHERE id_cliente = ?`,
    [clienteId]
  );

  const total = countRows[0].total;
  const totalPages = Math.ceil(total / limitNum);
  const currentPage = Math.floor(offsetNum / limitNum) + 1;

  res.json({
    success: true,
    data: movimientos.map(m => ({
      id: m.id_movimiento,
      fecha: m.fecha,
      monto: parseFloat(m.monto),
      tipoMovimiento: m.id_tipo_mov ? {
        id: m.id_tipo_mov,
        nombre: m.tipo_movimiento_nombre,
      } : null,
      observaciones: m.observaciones,
      factura: m.id_factura ? {
        id: m.id_factura,
        total: parseFloat(m.factura_total),
        estado: m.factura_estado,
      } : null,
    })),
    pagination: {
      total,
      page: currentPage,
      limit: limitNum,
      totalPages,
    },
  });
});

/**
 * GET /api/auth-cliente/facturas
 * Obtiene las facturas del cliente con filtros opcionales
 */
const getFacturas = asyncHandler(async (req, res) => {
  const clienteId = req.cliente.id;
  const { estado, limit = 10, offset = 0 } = req.query;
  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);

  let query = `
    SELECT 
      f.id_factura,
      f.fecha,
      f.total,
      f.estado,
      f.id_mesa,
      f.id_grupo
    FROM Factura f
    WHERE f.id_cliente = ?
  `;
  const params = [clienteId];

  // Filtrar por estado si se proporciona
  if (estado) {
    const estadoUpper = estado.toUpperCase();
    if (['PENDIENTE', 'COBRADA', 'ANULADA'].includes(estadoUpper)) {
      query += ` AND f.estado = ?`;
      params.push(estadoUpper);
    }
  }

  query += ` ORDER BY f.fecha DESC LIMIT ? OFFSET ?`;
  params.push(limitNum, offsetNum);

  const [facturas] = await promisePool.execute(query, params);

  // Contar total de registros con el mismo filtro
  let countQuery = `SELECT COUNT(*) as total FROM Factura WHERE id_cliente = ?`;
  const countParams = [clienteId];
  
  if (estado) {
    const estadoUpper = estado.toUpperCase();
    if (['PENDIENTE', 'COBRADA', 'ANULADA'].includes(estadoUpper)) {
      countQuery += ` AND estado = ?`;
      countParams.push(estadoUpper);
    }
  }

  const [countRows] = await promisePool.execute(countQuery, countParams);

  const total = countRows[0].total;
  const totalPages = Math.ceil(total / limitNum);
  const currentPage = Math.floor(offsetNum / limitNum) + 1;

  res.json({
    success: true,
    data: facturas.map(f => ({
      id: f.id_factura,
      fecha: f.fecha,
      total: parseFloat(f.total),
      estado: f.estado,
      idMesa: f.id_mesa,
      idGrupo: f.id_grupo,
    })),
    pagination: {
      total,
      page: currentPage,
      limit: limitNum,
      totalPages,
    },
  });
});

module.exports = {
  getPerfilCliente,
  getResumenCuenta,
  getMovimientos,
  getFacturas,
};
