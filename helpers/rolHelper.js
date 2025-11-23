const { promisePool } = require("../config/database");

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
  obtenerRolPorId,
  obtenerRolPorNombre,
  existeRolAsignado,
  eliminarRolAsignado,
};
