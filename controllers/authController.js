const bcrypt = require("bcrypt");
const { promisePool } = require("../config/database");
const { generateToken } = require("../helpers/jwt");
const asyncHandler = require("../helpers/asyncHandler");
const { enviarError, enviarExito } = require("../helpers/responseHelpers");
const {
  hashToken,
  generarToken,
  enviarMailRecuperacion,
} = require("../helpers/mailer");

const login = asyncHandler(async (req, res) => {
  const { nombreUsuario, contrasena } = req.body;

  if (!nombreUsuario || !contrasena) {
    return enviarError(res, 400, "Nombre de usuario y contraseña son requeridos");
  }

  const [rows] = await promisePool.execute(
    `SELECT u.id_usuario, u.nombre_usuario, u.contrasena, u.activo, u.foto_perfil,
            GROUP_CONCAT(r.nombre) AS roles
     FROM Usuario u
     LEFT JOIN UsuarioRol ur ON u.id_usuario = ur.id_usuario
     LEFT JOIN Rol r ON ur.id_rol = r.id_rol
     WHERE u.nombre_usuario = ?
     GROUP BY u.id_usuario, u.nombre_usuario, u.contrasena, u.activo, u.foto_perfil`,
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

  const usuarioData = {
    id: usuario.id_usuario,
    nombreUsuario: usuario.nombre_usuario,
    roles: roleNames,
  };

  if (usuario.foto_perfil) {
    const { getFileUrl } = require("../config/multer");
    usuarioData.fotoPerfil = usuario.foto_perfil;
    usuarioData.fotoPerfilUrl = getFileUrl(req, usuario.foto_perfil, "usuarios");
  }

  return enviarExito(res, {
    token,
    usuario: usuarioData,
  }, "Inicio de sesión exitoso");
});

/**
 * POST /api/auth/forgot-password
 * Solicitar recuperación de contraseña
 */
const olvidarContrasena = asyncHandler(async (req, res) => {
  const { nombreUsuario, email } = req.body;

  if (!nombreUsuario) {
    return enviarError(res, 400, "El nombre de usuario es requerido");
  }

  if (!email) {
    return enviarError(res, 400, "El email es requerido");
  }

  // Buscar usuario por nombre de usuario Y email (ambos deben coincidir)
  const [rows] = await promisePool.execute(
    "SELECT id_usuario, nombre_usuario, email FROM Usuario WHERE nombre_usuario = ? AND email = ? AND activo = 1",
    [nombreUsuario, email]
  );

  // Si no coinciden, mostrar error claro
  if (rows.length === 0) {
    return enviarError(res, 400, "El usuario y email no coinciden o el usuario está inactivo");
  }

  const usuario = rows[0];

  // Generar token y hash
  const token = generarToken();
  const tokenHash = hashToken(token);
  const expiracion = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

  // Guardar hash y expiración en BD
  await promisePool.execute(
    "UPDATE Usuario SET reset_token_hash = ?, reset_token_expires_at = ? WHERE id_usuario = ?",
    [tokenHash, expiracion, usuario.id_usuario]
  );

  // Enviar email con link
  try {
    await enviarMailRecuperacion(email, token, {
      baseUrl: process.env.FRONTEND_URL_USUARIO || process.env.FRONTEND_URL,
    });
    console.log(`✓ Email de recuperación enviado a ${email} para usuario ${nombreUsuario}`);
  } catch (errorMail) {
    console.error(`✗ Error al enviar email: ${errorMail.message}`);
    // No revelar que falló el email (por seguridad)
    // El token ya está guardado, podría reintentar después
  }

  return enviarExito(res, {}, "Email de recuperación enviado. Revisa tu bandeja de entrada.");
});

/**
 * POST /api/auth/reset-password
 * Restablecer contraseña con token
 */
const restablecerContrasena = asyncHandler(async (req, res) => {
  const { token, contrasenaNueva } = req.body;

  if (!token || !contrasenaNueva) {
    return enviarError(res, 400, "Token y contraseña nueva son requeridos");
  }

  if (contrasenaNueva.length < 6) {
    return enviarError(res, 400, "La contraseña debe tener al menos 6 caracteres");
  }

  // Hashear el token recibido para comparar
  const tokenHash = hashToken(token);

  // Buscar usuario con ese token válido y no expirado
  const [rows] = await promisePool.execute(
    "SELECT id_usuario FROM Usuario WHERE reset_token_hash = ? AND reset_token_expires_at > NOW()",
    [tokenHash]
  );

  if (rows.length === 0) {
    return enviarError(res, 401, "Token inválido o expirado");
  }

  const usuario = rows[0];

  // Hashear nueva contraseña
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
  const contrasenaNuevaHash = await bcrypt.hash(contrasenaNueva, saltRounds);

  // Actualizar contraseña y limpiar token
  await promisePool.execute(
    "UPDATE Usuario SET contrasena = ?, reset_token_hash = NULL, reset_token_expires_at = NULL WHERE id_usuario = ?",
    [contrasenaNuevaHash, usuario.id_usuario]
  );

  return enviarExito(res, {}, "Contraseña restablecida correctamente. Ya puedes iniciar sesión");
});

module.exports = {
  login,
  olvidarContrasena,
  restablecerContrasena,
};
