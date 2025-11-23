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

module.exports = {
  loginCliente,
};
