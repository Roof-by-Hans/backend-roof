const { promisePool } = require("../config/database");

const obtenerRolesUsuario = async (idUsuario) => {
  const [rows] = await promisePool.execute(
    `SELECT r.id_rol, r.nombre
     FROM Rol r
     INNER JOIN UsuarioRol ur ON ur.id_rol = r.id_rol
     WHERE ur.id_usuario = ?
     ORDER BY r.nombre`,
    [idUsuario]
  );

  return rows;
};

const obtenerRolPorId = async (idRol) => {
  const [rows] = await promisePool.execute(
    `SELECT id_rol, nombre
     FROM Rol
     WHERE id_rol = ?`,
    [idRol]
  );

  return rows[0] || null;
};

const obtenerRolPorNombre = async (nombreRol) => {
  const [rows] = await promisePool.execute(
    `SELECT id_rol, nombre
     FROM Rol
     WHERE LOWER(nombre) = LOWER(?)`,
    [nombreRol]
  );

  return rows[0] || null;
};

const existeRolAsignado = async (idUsuario, idRol) => {
  const [rows] = await promisePool.execute(
    `SELECT 1
     FROM UsuarioRol
     WHERE id_usuario = ? AND id_rol = ?
     LIMIT 1`,
    [idUsuario, idRol]
  );

  return rows.length > 0;
};

const eliminarRolAsignado = async (idUsuario, idRol) => {
  await promisePool.execute(
    `DELETE FROM UsuarioRol
     WHERE id_usuario = ? AND id_rol = ?`,
    [idUsuario, idRol]
  );
};

module.exports = {
  obtenerRolesUsuario,
  obtenerRolPorId,
  obtenerRolPorNombre,
  existeRolAsignado,
  eliminarRolAsignado,
};
