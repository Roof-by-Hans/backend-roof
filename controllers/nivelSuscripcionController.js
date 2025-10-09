const { promisePool } = require("../config/database");
const {
  mapNivelSuscripcionRow,
  mapNivelSuscripcionRows,
  mapNivelSuscripcionToDB,
} = require("../helpers/nivelSuscripcionMapper");

/**
 * Obtener todos los niveles de suscripción
 */
const getNivelesSuscripcion = async (req, res) => {
  try {
    const [rows] = await promisePool.execute(
      `SELECT id_nivel, nombre, limite_credito FROM NivelSuscripcion ORDER BY nombre`
    );

    res.json({
      success: true,
      data: mapNivelSuscripcionRows(rows),
      message: "Niveles de suscripción obtenidos exitosamente",
    });
  } catch (error) {
    console.error("Error al obtener niveles de suscripción:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Obtener un nivel de suscripción por ID
 */
const getNivelSuscripcionPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await promisePool.execute(
      `SELECT id_nivel, nombre, limite_credito FROM NivelSuscripcion WHERE id_nivel = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Nivel de suscripción no encontrado",
      });
    }

    res.json({
      success: true,
      data: mapNivelSuscripcionRow(rows[0]),
      message: "Nivel de suscripción obtenido exitosamente",
    });
  } catch (error) {
    console.error("Error al obtener nivel de suscripción:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Crear un nuevo nivel de suscripción
 */
const crearNivelSuscripcion = async (req, res) => {
  try {
    const { nombre, limite_credito } = req.body;

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "El nombre del nivel de suscripción es requerido",
      });
    }

    if (!limite_credito || limite_credito <= 0) {
      return res.status(400).json({
        success: false,
        message: "El límite de crédito debe ser mayor a 0",
      });
    }

    // Verificar si ya existe un nivel con ese nombre
    const [existente] = await promisePool.execute(
      `SELECT id_nivel FROM NivelSuscripcion WHERE nombre = ?`,
      [nombre.trim()]
    );

    if (existente.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un nivel de suscripción con ese nombre",
      });
    }

    const nivelData = mapNivelSuscripcionToDB({ 
      nombre: nombre.trim(),
      limite_credito: parseFloat(limite_credito)
    });

    const [result] = await promisePool.execute(
      `INSERT INTO NivelSuscripcion (nombre, limite_credito) VALUES (?, ?)`,
      [nivelData.nombre, nivelData.limite_credito]
    );

    // Obtener el nivel creado
    const [nuevoNivel] = await promisePool.execute(
      `SELECT id_nivel, nombre, limite_credito FROM NivelSuscripcion WHERE id_nivel = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: mapNivelSuscripcionRow(nuevoNivel[0]),
      message: "Nivel de suscripción creado exitosamente",
    });
  } catch (error) {
    console.error("Error al crear nivel de suscripción:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Actualizar un nivel de suscripción
 */
const actualizarNivelSuscripcion = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, limite_credito } = req.body;

    // Verificar que el nivel existe
    const [nivelExiste] = await promisePool.execute(
      `SELECT id_nivel FROM NivelSuscripcion WHERE id_nivel = ?`,
      [id]
    );

    if (nivelExiste.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Nivel de suscripción no encontrado",
      });
    }

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "El nombre del nivel de suscripción es requerido",
      });
    }

    if (!limite_credito || limite_credito <= 0) {
      return res.status(400).json({
        success: false,
        message: "El límite de crédito debe ser mayor a 0",
      });
    }

    // Verificar si ya existe otro nivel con ese nombre
    const [existente] = await promisePool.execute(
      `SELECT id_nivel FROM NivelSuscripcion WHERE nombre = ? AND id_nivel != ?`,
      [nombre.trim(), id]
    );

    if (existente.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ya existe otro nivel de suscripción con ese nombre",
      });
    }

    await promisePool.execute(
      `UPDATE NivelSuscripcion SET nombre = ?, limite_credito = ? WHERE id_nivel = ?`,
      [nombre.trim(), parseFloat(limite_credito), id]
    );

    // Obtener el nivel actualizado
    const [nivelActualizado] = await promisePool.execute(
      `SELECT id_nivel, nombre, limite_credito FROM NivelSuscripcion WHERE id_nivel = ?`,
      [id]
    );

    res.json({
      success: true,
      data: mapNivelSuscripcionRow(nivelActualizado[0]),
      message: "Nivel de suscripción actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error al actualizar nivel de suscripción:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Eliminar un nivel de suscripción
 */
const eliminarNivelSuscripcion = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el nivel existe
    const [nivelExiste] = await promisePool.execute(
      `SELECT id_nivel FROM NivelSuscripcion WHERE id_nivel = ?`,
      [id]
    );

    if (nivelExiste.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Nivel de suscripción no encontrado",
      });
    }

    // Verificar si hay tarjetas usando este nivel
    const [tarjetasConNivel] = await promisePool.execute(
      `SELECT COUNT(*) as total FROM Tarjeta WHERE id_nivel_suscripcion = ?`,
      [id]
    );

    if (tarjetasConNivel[0].total > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar. Hay ${tarjetasConNivel[0].total} tarjeta(s) usando este nivel de suscripción`,
      });
    }

    await promisePool.execute(
      `DELETE FROM NivelSuscripcion WHERE id_nivel = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Nivel de suscripción eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar nivel de suscripción:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

module.exports = {
  getNivelesSuscripcion,
  getNivelSuscripcionPorId,
  crearNivelSuscripcion,
  actualizarNivelSuscripcion,
  eliminarNivelSuscripcion,
};
