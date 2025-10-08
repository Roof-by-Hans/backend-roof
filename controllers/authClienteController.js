const bcrypt = require("bcrypt");
const { promisePool } = require("../config/database");
const { generateToken } = require("../helpers/jwt");
const { mapClienteRow } = require("../helpers/clienteMapper");

const loginCliente = async (req, res) => {
  try {
    const { email, contrasena } = req.body;

    if (!email || !contrasena) {
      return res.status(400).json({
        success: false,
        message: "Los campos email y contrasena son obligatorios",
      });
    }

    const [rows] = await promisePool.execute(
      `SELECT c.id_cliente, 
              c.nombre, 
              c.apellido, 
              c.telefono, 
              c.email, 
              c.contrasena,
              c.id_tarjeta,
              t.uuid AS tarjeta_uuid
       FROM Cliente c
       LEFT JOIN Tarjeta t ON t.id_tarjeta = c.id_tarjeta
       WHERE c.email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    const cliente = rows[0];

    // Verificar si el cliente tiene contraseña configurada
    if (!cliente.contrasena) {
      return res.status(403).json({
        success: false,
        message: "El cliente no tiene contraseña configurada",
      });
    }

    const contrasenaValida = await bcrypt.compare(
      contrasena,
      cliente.contrasena
    );

    if (!contrasenaValida) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    const payload = {
      id: cliente.id_cliente,
      email: cliente.email,
      tipo: "cliente",
    };

    const token = generateToken(payload);
    const clienteMapeado = mapClienteRow(cliente);

    res.json({
      success: true,
      message: "Inicio de sesión exitoso",
      data: {
        token,
        cliente: clienteMapeado,
      },
    });
  } catch (error) {
    console.error("Error en loginCliente:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

module.exports = {
  loginCliente,
};
