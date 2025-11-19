const { promisePool } = require("../config/database");
const { mapUsuariosRows, mapUsuarioRow } = require("../helpers/usuarioMapper");
const { getFileUrl } = require("../config/multer");

/**
 * Obtener todos los usuarios con rol "Mozo"
 */
const getMozos = async (req, res) => {
  try {
    const [rows] = await promisePool.execute(
      `SELECT u.id_usuario,
        u.nombre_usuario,
        u.activo,
        u.foto_perfil,
        GROUP_CONCAT(DISTINCT r.nombre ORDER BY r.nombre SEPARATOR ',') AS roles
       FROM Usuario u
       INNER JOIN UsuarioRol ur ON ur.id_usuario = u.id_usuario
       INNER JOIN Rol r ON r.id_rol = ur.id_rol
       WHERE LOWER(r.nombre) = 'mozo'
       GROUP BY u.id_usuario, u.nombre_usuario, u.activo, u.foto_perfil
       ORDER BY u.nombre_usuario`
    );

    // Agregar URL completa de las imágenes de perfil
    const mozosConImagenes = mapUsuariosRows(rows).map((mozo) => {
      if (mozo.fotoPerfil) {
        mozo.fotoPerfilUrl = getFileUrl(req, mozo.fotoPerfil, "usuarios");
      }
      return mozo;
    });

    res.json({
      success: true,
      data: mozosConImagenes,
      message: "Mozos obtenidos correctamente",
    });
  } catch (error) {
    console.error("Error al obtener mozos:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Obtener un mozo por ID (solo si tiene rol "Mozo")
 */
const getMozoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await promisePool.execute(
      `SELECT u.id_usuario,
        u.nombre_usuario,
        u.activo,
        u.foto_perfil,
        GROUP_CONCAT(DISTINCT r.nombre ORDER BY r.nombre SEPARATOR ',') AS roles
       FROM Usuario u
       INNER JOIN UsuarioRol ur ON ur.id_usuario = u.id_usuario
       INNER JOIN Rol r ON r.id_rol = ur.id_rol
       WHERE u.id_usuario = ? AND LOWER(r.nombre) = 'mozo'
       GROUP BY u.id_usuario, u.nombre_usuario, u.activo, u.foto_perfil`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Mozo no encontrado",
      });
    }

    const mozoMapeado = mapUsuarioRow(rows[0]);
    if (mozoMapeado.fotoPerfil) {
      mozoMapeado.fotoPerfilUrl = getFileUrl(
        req,
        mozoMapeado.fotoPerfil,
        "usuarios"
      );
    }

    res.json({
      success: true,
      data: mozoMapeado,
      message: "Mozo obtenido correctamente",
    });
  } catch (error) {
    console.error("Error al obtener mozo:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Obtener solo mozos activos
 */
const getMozosActivos = async (req, res) => {
  try {
    const [rows] = await promisePool.execute(
      `SELECT u.id_usuario,
        u.nombre_usuario,
        u.activo,
        u.foto_perfil,
        GROUP_CONCAT(DISTINCT r.nombre ORDER BY r.nombre SEPARATOR ',') AS roles
       FROM Usuario u
       INNER JOIN UsuarioRol ur ON ur.id_usuario = u.id_usuario
       INNER JOIN Rol r ON r.id_rol = ur.id_rol
       WHERE LOWER(r.nombre) = 'mozo' AND u.activo = 1
       GROUP BY u.id_usuario, u.nombre_usuario, u.activo, u.foto_perfil
       ORDER BY u.nombre_usuario`
    );

    // Agregar URL completa de las imágenes de perfil
    const mozosConImagenes = mapUsuariosRows(rows).map((mozo) => {
      if (mozo.fotoPerfil) {
        mozo.fotoPerfilUrl = getFileUrl(req, mozo.fotoPerfil, "usuarios");
      }
      return mozo;
    });

    res.json({
      success: true,
      data: mozosConImagenes,
      message: "Mozos activos obtenidos correctamente",
    });
  } catch (error) {
    console.error("Error al obtener mozos activos:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

module.exports = {
  getMozos,
  getMozoPorId,
  getMozosActivos,
};
