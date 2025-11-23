const bcrypt = require("bcrypt");
const { promisePool } = require("../config/database");
const { generateToken } = require("../helpers/jwt");
const asyncHandler = require("../helpers/asyncHandler");
const { enviarError, enviarExito } = require("../helpers/responseHelpers");

const login = asyncHandler(async (req, res) => {
  const { nombreUsuario, contrasena } = req.body;

  if (!nombreUsuario || !contrasena) {
    return enviarError(res, 400, "Nombre de usuario y contraseña son requeridos");
  }

  const [rows] = await promisePool.execute(
    `SELECT u.id_usuario, u.nombre_usuario, u.contrasena, u.activo,
            GROUP_CONCAT(r.nombre) AS roles
     FROM Usuario u
     LEFT JOIN UsuarioRol ur ON u.id_usuario = ur.id_usuario
     LEFT JOIN Rol r ON ur.id_rol = r.id_rol
     WHERE u.nombre_usuario = ?
     GROUP BY u.id_usuario, u.nombre_usuario, u.contrasena, u.activo`,
    [nombreUsuario]
  );

  if (rows.length === 0) {
    return enviarError(res, 401, "Credenciales inválidas");
  }

  const usuario = rows[0];

  if (!usuario.activo) {
    return enviarError(res, 401, "Usuario inactivo");
  }

  const passwordMatch = await bcrypt.compare(contrasena, usuario.contrasena);

  if (!passwordMatch) {
    return enviarError(res, 401, "Credenciales inválidas");
  }

  const roleNames = usuario.roles ? usuario.roles.split(',') : [];

  const token = generateToken({
    id: usuario.id_usuario,
    nombreUsuario: usuario.nombre_usuario,
    roles: roleNames,
  });

  return enviarExito(res, {
    token,
    usuario: {
      id: usuario.id_usuario,
      nombreUsuario: usuario.nombre_usuario,
      roles: roleNames,
    },
  }, "Inicio de sesión exitoso");
});

module.exports = {
  login,
};
