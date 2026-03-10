const { promisePool } = require("../config/database");
const {
  mapTipoSuscripcionRow,
  mapTipoSuscripcionRows,
  mapTipoSuscripcionToDB,
  TIPOS_PERMITIDOS,
} = require("../helpers/tipoSuscripcionMapper");
const asyncHandler = require("../helpers/asyncHandler");

/**
 * Obtener todos los tipos de suscripción
 */
const getTiposSuscripcion = asyncHandler(async (req, res) => {
  const [rows] = await promisePool.execute(
    `SELECT id_tipo, nombre FROM TipoSuscripcion WHERE habilitar = 1 ORDER BY nombre`
  );

  res.json({
    success: true,
    data: mapTipoSuscripcionRows(rows),
    message: "Tipos de suscripción obtenidos exitosamente",
  });
});

/**
 * Obtener un tipo de suscripción por ID
 */
const getTipoSuscripcionPorId = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [rows] = await promisePool.execute(
    `SELECT id_tipo, nombre FROM TipoSuscripcion WHERE id_tipo = ? AND habilitar = 1`,
    [id]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Tipo de suscripción no encontrado",
    });
  }

  res.json({
    success: true,
    data: mapTipoSuscripcionRow(rows[0]),
    message: "Tipo de suscripción obtenido exitosamente",
  });
});

/**
 * Crear un nuevo tipo de suscripción
 */
const crearTipoSuscripcion = asyncHandler(async (req, res) => {
  const { nombre } = req.body;

  // Validaciones
  if (!nombre || nombre.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "El nombre del tipo de suscripción es requerido",
    });
  }

  // Validar que el nombre sea uno de los valores permitidos del enum
  const nombreUpper = nombre.trim().toUpperCase();
  
  if (!TIPOS_PERMITIDOS.includes(nombreUpper)) {
    return res.status(400).json({
      success: false,
      message: `El tipo de suscripción debe ser uno de: ${TIPOS_PERMITIDOS.join(', ')}`,
    });
  }

  // Verificar si ya existe un tipo con ese nombre (habilitado o no)
  const [existente] = await promisePool.execute(
    `SELECT id_tipo FROM TipoSuscripcion WHERE nombre = ?`,
    [nombreUpper]
  );

  if (existente.length > 0) {
    // Verificar si está habilitado
    const [habilitado] = await promisePool.execute(
      `SELECT id_tipo FROM TipoSuscripcion WHERE nombre = ? AND habilitar = 1`,
      [nombreUpper]
    );
    
    if (habilitado.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un tipo de suscripción con ese nombre",
      });
    }
    
    // Si existe pero deshabilitado, reactivarlo
    await promisePool.execute(
      `UPDATE TipoSuscripcion SET habilitar = 1 WHERE nombre = ?`,
      [nombreUpper]
    );
    
    const [tipoReactivado] = await promisePool.execute(
      `SELECT id_tipo, nombre FROM TipoSuscripcion WHERE nombre = ?`,
      [nombreUpper]
    );
    
    return res.status(201).json({
      success: true,
      data: mapTipoSuscripcionRow(tipoReactivado[0]),
      message: "Tipo de suscripción reactivado exitosamente",
    });
  }

  const tipoData = mapTipoSuscripcionToDB({ nombre: nombreUpper });

  const [result] = await promisePool.execute(
    `INSERT INTO TipoSuscripcion (nombre, habilitar) VALUES (?, 1)`,
    [tipoData.nombre]
  );

  // Obtener el tipo creado
  const [nuevoTipo] = await promisePool.execute(
    `SELECT id_tipo, nombre FROM TipoSuscripcion WHERE id_tipo = ?`,
    [result.insertId]
  );

  res.status(201).json({
    success: true,
    data: mapTipoSuscripcionRow(nuevoTipo[0]),
    message: "Tipo de suscripción creado exitosamente",
  });
});

/**
 * Actualizar un tipo de suscripción
 */
const actualizarTipoSuscripcion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;

  // Verificar que el tipo existe y está habilitado
  const [tipoExiste] = await promisePool.execute(
    `SELECT id_tipo FROM TipoSuscripcion WHERE id_tipo = ? AND habilitar = 1`,
    [id]
  );

  if (tipoExiste.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Tipo de suscripción no encontrado",
    });
  }

  // Validaciones
  if (!nombre || nombre.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "El nombre del tipo de suscripción es requerido",
    });
  }

  // Validar que el nombre sea uno de los valores permitidos del enum
  const nombreUpper = nombre.trim().toUpperCase();
  
  if (!TIPOS_PERMITIDOS.includes(nombreUpper)) {
    return res.status(400).json({
      success: false,
      message: `El tipo de suscripción debe ser uno de: ${TIPOS_PERMITIDOS.join(', ')}`,
    });
  }

  // Verificar si ya existe otro tipo con ese nombre (habilitado)
  const [existente] = await promisePool.execute(
    `SELECT id_tipo FROM TipoSuscripcion WHERE nombre = ? AND id_tipo != ? AND habilitar = 1`,
    [nombreUpper, id]
  );

  if (existente.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Ya existe otro tipo de suscripción con ese nombre",
    });
  }

  await promisePool.execute(
    `UPDATE TipoSuscripcion SET nombre = ? WHERE id_tipo = ?`,
    [nombreUpper, id]
  );

  // Obtener el tipo actualizado
  const [tipoActualizado] = await promisePool.execute(
    `SELECT id_tipo, nombre FROM TipoSuscripcion WHERE id_tipo = ?`,
    [id]
  );

  res.json({
    success: true,
    data: mapTipoSuscripcionRow(tipoActualizado[0]),
    message: "Tipo de suscripción actualizado exitosamente",
  });
});

/**
 * Eliminar un tipo de suscripción (borrado lógico)
 */
const eliminarTipoSuscripcion = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verificar que el tipo existe y está habilitado
  const [tipoExiste] = await promisePool.execute(
    `SELECT id_tipo FROM TipoSuscripcion WHERE id_tipo = ? AND habilitar = 1`,
    [id]
  );

  if (tipoExiste.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Tipo de suscripción no encontrado",
    });
  }

  // Verificar si hay tarjetas usando este tipo
  const [tarjetasConTipo] = await promisePool.execute(
    `SELECT COUNT(*) as total FROM Tarjeta WHERE id_tipo_suscripcion = ?`,
    [id]
  );

  if (tarjetasConTipo[0].total > 0) {
    return res.status(400).json({
      success: false,
      message: `No se puede eliminar. Hay ${tarjetasConTipo[0].total} tarjeta(s) usando este tipo de suscripción`,
    });
  }

  // Borrado lógico
  await promisePool.execute(
    `UPDATE TipoSuscripcion SET habilitar = 0 WHERE id_tipo = ?`,
    [id]
  );

  res.json({
    success: true,
    message: "Tipo de suscripción deshabilitado exitosamente",
  });
});

module.exports = {
  getTiposSuscripcion,
  getTipoSuscripcionPorId,
  crearTipoSuscripcion,
  actualizarTipoSuscripcion,
  eliminarTipoSuscripcion,
};
