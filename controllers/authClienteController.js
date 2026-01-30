const bcrypt = require("bcrypt");
const { promisePool } = require("../config/database");
const { generateToken } = require("../helpers/jwt");
const asyncHandler = require("../helpers/asyncHandler");

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

module.exports = {
  loginCliente,
  registrarCliente,
};
