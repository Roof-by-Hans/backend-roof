const bcrypt = require("bcrypt");
const { promisePool } = require("../config/database");
const { generateToken } = require("../helpers/jwt");
const asyncHandler = require("../helpers/asyncHandler");
const {
  hashToken,
  generarToken,
  enviarMailRecuperacion,
} = require("../helpers/mailer");

const loginCliente = asyncHandler(async (req, res) => {
  const { email, contrasena } = req.body;

  if (!email || !contrasena) {
    return res.status(400).json({
      success: false,
      message: "Email y contraseña son requeridos",
    });
  }

  const [rows] = await promisePool.execute(
    `SELECT id_cliente, nombre, apellido, email, contrasena
     FROM Cliente
     WHERE email = ?`,
    [email]
  );

  if (rows.length === 0) {
    return res.status(401).json({
      success: false,
      message: "Credenciales inválidas",
    });
  }

  const cliente = rows[0];
  const passwordMatch = await bcrypt.compare(contrasena, cliente.contrasena);

  if (!passwordMatch) {
    return res.status(401).json({
      success: false,
      message: "Credenciales inválidas",
    });
  }

  const token = generateToken({
    id: cliente.id_cliente,
    email: cliente.email,
    tipo: "cliente",
  });

  res.json({
    success: true,
    message: "Inicio de sesión exitoso",
    data: {
      token,
      cliente: {
        id: cliente.id_cliente,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        email: cliente.email,
      },
    },
  });
});

const registrarCliente = asyncHandler(async (req, res) => {
  const { nombre, apellido, email, telefono, contrasena } = req.body;

  // Validaciones
  if (!nombre || !apellido || !email || !contrasena) {
    return res.status(400).json({
      success: false,
      message: "Nombre, apellido, email y contraseña son requeridos",
    });
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "El formato del email es inválido",
    });
  }

  // Verificar si el email ya existe
  const [existingCliente] = await promisePool.execute(
    "SELECT id_cliente FROM Cliente WHERE email = ?",
    [email]
  );

  if (existingCliente.length > 0) {
    return res.status(409).json({
      success: false,
      message: "El email ya está registrado",
    });
  }

  // Hashear contraseña
  const hashedPassword = await bcrypt.hash(contrasena, 10);

  // Crear cliente
  const [result] = await promisePool.execute(
    `INSERT INTO Cliente (nombre, apellido, email, telefono, contrasena)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, apellido, email, telefono || null, hashedPassword]
  );

  // Generar token para login automático
  const token = generateToken({
    id: result.insertId,
    email: email,
    tipo: "cliente",
  });

  res.status(201).json({
    success: true,
    message: "Cliente registrado exitosamente",
    data: {
      token,
      cliente: {
        id: result.insertId,
        nombre,
        apellido,
        email,
        telefono,
      },
    },
  });
});

const olvidarContrasenaCliente = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "El email es requerido",
    });
  }

  const [rows] = await promisePool.execute(
    "SELECT id_cliente, email FROM Cliente WHERE email = ? AND habilitar = 1",
    [email]
  );

  if (rows.length > 0) {
    const cliente = rows[0];
    const token = generarToken();
    const tokenHash = hashToken(token);
    const expiracion = new Date(Date.now() + 15 * 60 * 1000);

    await promisePool.execute(
      "UPDATE Cliente SET reset_token_hash = ?, reset_token_expires_at = ? WHERE id_cliente = ?",
      [tokenHash, expiracion, cliente.id_cliente]
    );

    try {
      await enviarMailRecuperacion(cliente.email, token, {
        baseUrl: process.env.FRONTEND_URL_CLIENTE || process.env.FRONTEND_URL,
      });
      console.log(`✓ Email de recuperación enviado a ${cliente.email}`);
    } catch (errorMail) {
      console.error(`✗ Error al enviar email de recuperación: ${errorMail.message}`);
    }
  }

  return res.json({
    success: true,
    message: "Si el email existe, recibirás un enlace para restablecer tu contraseña.",
  });
});

const restablecerContrasenaCliente = asyncHandler(async (req, res) => {
  const { token, contrasenaNueva } = req.body;

  if (!token || !contrasenaNueva) {
    return res.status(400).json({
      success: false,
      message: "Token y contraseña nueva son requeridos",
    });
  }

  if (contrasenaNueva.length < 6) {
    return res.status(400).json({
      success: false,
      message: "La contraseña debe tener al menos 6 caracteres",
    });
  }

  const tokenHash = hashToken(token);

  const [rows] = await promisePool.execute(
    "SELECT id_cliente FROM Cliente WHERE reset_token_hash = ? AND reset_token_expires_at > NOW()",
    [tokenHash]
  );

  if (rows.length === 0) {
    return res.status(401).json({
      success: false,
      message: "Token inválido o expirado",
    });
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
  const contrasenaNuevaHash = await bcrypt.hash(contrasenaNueva, saltRounds);

  await promisePool.execute(
    "UPDATE Cliente SET contrasena = ?, reset_token_hash = NULL, reset_token_expires_at = NULL WHERE id_cliente = ?",
    [contrasenaNuevaHash, rows[0].id_cliente]
  );

  return res.json({
    success: true,
    message: "Contraseña restablecida correctamente. Ya puedes iniciar sesión",
  });
});

module.exports = {
  loginCliente,
  registrarCliente,
  olvidarContrasenaCliente,
  restablecerContrasenaCliente,
};
