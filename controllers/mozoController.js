const { promisePool } = require("../config/database");
const { mapUsuariosRows, mapUsuarioRow } = require("../helpers/usuarioMapper");
const { getFileUrl } = require("../config/multer");
const asyncHandler = require("../helpers/asyncHandler");

/**
 * Obtener todos los usuarios con rol "Mozo"
 */
const getMozos = asyncHandler(async (req, res) => {
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
});

/**
 * Obtener un mozo por ID (solo si tiene rol "Mozo")
 */
const getMozoPorId = asyncHandler(async (req, res) => {
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
});

/**
 * Obtener solo mozos activos
 */
const getMozosActivos = asyncHandler(async (req, res) => {
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
});

module.exports = {
  getMozos,
  getMozoPorId,
  getMozosActivos,
};
