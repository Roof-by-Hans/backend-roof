const bcrypt = require("bcrypt");
const path = require("path");
const { promisePool } = require("../config/database");
const asyncHandler = require("../helpers/asyncHandler");
const { deleteFile, getFileUrl } = require("../config/multer");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

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

  // Obtener datos base de cliente/tarjeta/suscripcion
  const [saldoRows] = await promisePool.execute(
    `SELECT c.id_cliente,
            t.saldo_actual,
            t.estado,
            ts.nombre AS tipo_suscripcion,
            ns.limite_credito
     FROM Cliente c
     LEFT JOIN Tarjeta t ON c.id_tarjeta = t.id_tarjeta
     LEFT JOIN TipoSuscripcion ts ON t.id_tipo_suscripcion = ts.id_tipo
     LEFT JOIN NivelSuscripcion ns ON t.id_nivel_suscripcion = ns.id_nivel
     WHERE c.id_cliente = ?`,
    [clienteId]
  );

  if (saldoRows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Cliente no encontrado",
    });
  }

  const cliente = saldoRows[0];

  const saldoActual = cliente.saldo_actual ? parseFloat(cliente.saldo_actual) : 0;
  const estadoTarjeta = cliente.estado || null;
  const tipoSuscripcion = cliente.tipo_suscripcion || null;
  const esCredito = tipoSuscripcion === "CREDITO";

  // Corte mensual en America/Argentina/Buenos_Aires (UTC-3)
  const now = new Date();
  const argentinaNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const anio = argentinaNow.getUTCFullYear();
  const mes = argentinaNow.getUTCMonth() + 1;

  const inicioLocalSql = `${anio}-${String(mes).padStart(2, "0")}-01 00:00:00`;
  const ultimoDiaDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const finLocalSql = `${anio}-${String(mes).padStart(2, "0")}-${String(
    ultimoDiaDelMes
  ).padStart(2, "0")} 23:59:59`;

  const inicioPeriodo = new Date(Date.UTC(anio, mes - 1, 1, 3, 0, 0, 0)).toISOString();
  const finPeriodo = new Date(Date.UTC(anio, mes, 1, 2, 59, 59, 999)).toISOString();

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

  // Obtener consumos del mes para limite de credito
  const [consumoMesRows] = await promisePool.execute(
    `SELECT COALESCE(SUM(mc.monto), 0) AS consumido_mes
     FROM MovimientoCuenta mc
     INNER JOIN TipoMovimiento tm ON mc.id_tipo_mov = tm.id_tipo_mov
     WHERE mc.id_cliente = ?
       AND tm.nombre = 'CONSUMO'
       AND mc.fecha >= ?
       AND mc.fecha <= ?`,
    [clienteId, inicioLocalSql, finLocalSql]
  );

  const limiteTotal = esCredito ? parseFloat(cliente.limite_credito || 0) : 0;
  const consumidoMes = esCredito
    ? parseFloat(consumoMesRows[0]?.consumido_mes || 0)
    : 0;

  const limiteRestante = esCredito
    ? Math.max(limiteTotal - saldoActual, 0)
    : 0;

  if (esCredito && saldoActual > limiteTotal) {
    console.warn(
      `Inconsistencia de credito para cliente ${clienteId}: saldoActual (${saldoActual}) > limiteTotal (${limiteTotal})`
    );
  }

  let totalConsumos = 0;
  let totalPagos = 0;

  for (const row of totalesRows) {
    const total = parseFloat(row.total || 0);
    if (row.tipo === "CONSUMO") totalConsumos = total;
    if (row.tipo === "PAGO") totalPagos = total;
  }

  const [ultimoMovimientoRows] = await promisePool.execute(
    `SELECT MAX(fecha) AS ultimo_movimiento
     FROM MovimientoCuenta
     WHERE id_cliente = ?`,
    [clienteId]
  );

  res.json({
    success: true,
    data: {
      saldoActual,
      totalConsumos,
      totalPagos,
      ultimoMovimiento: ultimoMovimientoRows[0]?.ultimo_movimiento || null,
      estadoTarjeta,
      tipoSuscripcion,
      totalMovimientos: countRows[0].total,
      totalesPorTipo: totalesRows.map(row => ({
        tipo: row.tipo,
        cantidad: row.cantidad,
        total: parseFloat(row.total || 0),
      })),
      limiteTotal,
      consumidoMes,
      limiteRestante,
      periodo: {
        anio,
        mes,
        inicio: inicioPeriodo,
        fin: finPeriodo,
      },
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

/**
 * PUT /api/auth-cliente/me
 * Actualiza el perfil del cliente autenticado (nombre, apellido, teléfono, preferencias)
 */
const actualizarPerfil = asyncHandler(async (req, res) => {
  const clienteId = req.cliente.id;
  const { nombre, apellido, telefono, preferencias } = req.body;

  // Validaciones básicas
  if (!nombre || !apellido) {
    return res.status(400).json({
      success: false,
      message: "Los campos nombre y apellido son obligatorios",
    });
  }

  // Validar que el cliente existe
  const [clienteExiste] = await promisePool.execute(
    "SELECT id_cliente FROM Cliente WHERE id_cliente = ?",
    [clienteId]
  );

  if (clienteExiste.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Cliente no encontrado",
    });
  }

  // Actualizar datos del cliente
  await promisePool.execute(
    `UPDATE Cliente 
     SET nombre = ?, apellido = ?, telefono = ?, preferencias = ?
     WHERE id_cliente = ?`,
    [nombre, apellido, telefono || null, preferencias || null, clienteId]
  );

  // Obtener datos actualizados
  const [rows] = await promisePool.execute(
    `SELECT 
      c.id_cliente,
      c.nombre,
      c.apellido,
      c.email,
      c.telefono,
      c.foto_perfil,
      c.preferencias
     FROM Cliente c
     WHERE c.id_cliente = ?`,
    [clienteId]
  );

  res.json({
    success: true,
    message: "Perfil actualizado exitosamente",
    data: {
      id: rows[0].id_cliente,
      nombre: rows[0].nombre,
      apellido: rows[0].apellido,
      email: rows[0].email,
      telefono: rows[0].telefono,
      fotoPerfil: rows[0].foto_perfil,
      preferencias: rows[0].preferencias,
    },
  });
});

/**
 * PUT /api/auth-cliente/contrasena
 * Cambia la contraseña del cliente autenticado
 */
const cambiarContrasena = asyncHandler(async (req, res) => {
  const clienteId = req.cliente.id;
  const { contrasenaActual, contrasenaNueva } = req.body;

  // Validaciones básicas
  if (!contrasenaActual || !contrasenaNueva) {
    return res.status(400).json({
      success: false,
      message: "La contraseña actual y la nueva son obligatorias",
    });
  }

  if (contrasenaNueva.length < 6) {
    return res.status(400).json({
      success: false,
      message: "La contraseña nueva debe tener al menos 6 caracteres",
    });
  }

  // Obtener la contraseña actual del cliente
  const [rows] = await promisePool.execute(
    "SELECT contrasena FROM Cliente WHERE id_cliente = ?",
    [clienteId]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Cliente no encontrado",
    });
  }

  // Verificar que la contraseña actual sea correcta
  const contrasenaValida = await bcrypt.compare(
    contrasenaActual,
    rows[0].contrasena
  );

  if (!contrasenaValida) {
    return res.status(401).json({
      success: false,
      message: "La contraseña actual es incorrecta",
    });
  }

  // Hash de la nueva contraseña
  const hashedPassword = await bcrypt.hash(contrasenaNueva, SALT_ROUNDS);

  // Actualizar contraseña
  await promisePool.execute(
    "UPDATE Cliente SET contrasena = ? WHERE id_cliente = ?",
    [hashedPassword, clienteId]
  );

  res.json({
    success: true,
    message: "Contraseña actualizada exitosamente",
  });
});

/**
 * PUT /api/auth-cliente/foto
 * Actualiza la foto de perfil del cliente autenticado
 */
const actualizarFoto = asyncHandler(async (req, res) => {
  const clienteId = req.cliente.id;
  const nuevaFoto = req.file ? req.file.filename : null;

  if (!nuevaFoto) {
    return res.status(400).json({
      success: false,
      message: "No se proporcionó una imagen",
    });
  }

  // Obtener la foto actual del cliente
  const [rows] = await promisePool.execute(
    "SELECT foto_perfil FROM Cliente WHERE id_cliente = ?",
    [clienteId]
  );

  if (rows.length === 0) {
    // Eliminar la imagen recién subida
    const rutaImagen = path.join(
      __dirname,
      "..",
      "uploads",
      "clientes",
      nuevaFoto
    );
    await deleteFile(rutaImagen);

    return res.status(404).json({
      success: false,
      message: "Cliente no encontrado",
    });
  }

  const fotoAnterior = rows[0].foto_perfil;

  // Actualizar la foto en la base de datos
  await promisePool.execute(
    "UPDATE Cliente SET foto_perfil = ? WHERE id_cliente = ?",
    [nuevaFoto, clienteId]
  );

  // Eliminar la foto anterior si existía
  if (fotoAnterior) {
    const rutaFotoAnterior = path.join(
      __dirname,
      "..",
      "uploads",
      "clientes",
      fotoAnterior
    );
    await deleteFile(rutaFotoAnterior).catch((err) => {
      console.error("Error al eliminar foto anterior:", err);
    });
  }

  const fotoPerfilUrl = getFileUrl(req, nuevaFoto, "clientes");

  res.json({
    success: true,
    message: "Foto de perfil actualizada exitosamente",
    data: {
      fotoPerfil: nuevaFoto,
      fotoPerfilUrl,
    },
  });
});

/**
 * DELETE /api/auth-cliente/foto
 * Elimina la foto de perfil del cliente autenticado
 */
const eliminarFoto = asyncHandler(async (req, res) => {
  const clienteId = req.cliente.id;

  // Obtener la foto actual del cliente
  const [rows] = await promisePool.execute(
    "SELECT foto_perfil FROM Cliente WHERE id_cliente = ?",
    [clienteId]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Cliente no encontrado",
    });
  }

  const fotoActual = rows[0].foto_perfil;

  if (!fotoActual) {
    return res.status(400).json({
      success: false,
      message: "El cliente no tiene foto de perfil",
    });
  }

  // Eliminar la referencia en la base de datos
  await promisePool.execute(
    "UPDATE Cliente SET foto_perfil = NULL WHERE id_cliente = ?",
    [clienteId]
  );

  // Eliminar el archivo físico
  const rutaFoto = path.join(__dirname, "..", "uploads", "clientes", fotoActual);
  await deleteFile(rutaFoto).catch((err) => {
    console.error("Error al eliminar archivo de foto:", err);
  });

  res.json({
    success: true,
    message: "Foto de perfil eliminada exitosamente",
  });
});

module.exports = {
  getPerfilCliente,
  getResumenCuenta,
  getMovimientos,
  getFacturas,
  actualizarPerfil,
  cambiarContrasena,
  actualizarFoto,
  eliminarFoto,
};
