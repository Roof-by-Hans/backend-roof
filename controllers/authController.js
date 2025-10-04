const bcrypt = require("bcrypt");
const { promisePool } = require("../config/database");
const { generateToken } = require("../helpers/jwt");
const { mapUsuarioRow } = require("../helpers/usuarioMapper");
const { obtenerRolesUsuario } = require("../helpers/rolHelper");

const login = async (req, res) => {
  try {
    const { nombreUsuario, contrasena } = req.body;

    if (!nombreUsuario || !contrasena) {
      return res.status(400).json({
        success: false,
        message: "Los campos nombreUsuario y contrasena son obligatorios",
      });
    }

    const [rows] = await promisePool.execute(
      `SELECT id_usuario, nombre_usuario, contrasena, activo
       FROM Usuario
       WHERE nombre_usuario = ?`,
      [nombreUsuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    const usuario = rows[0];

    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        message: "El usuario se encuentra inactivo",
      });
    }

    const contrasenaValida = await bcrypt.compare(
      contrasena,
      usuario.contrasena
    );

    if (!contrasenaValida) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    const roles = await obtenerRolesUsuario(usuario.id_usuario);
    const roleNames = roles.map((rol) => rol.nombre);

    const payload = {
      id: usuario.id_usuario,
      nombreUsuario: usuario.nombre_usuario,
      roles: roleNames,
    };

    const token = generateToken(payload);
    const usuarioMapeado = {
      ...mapUsuarioRow(usuario),
      roles: roleNames,
    };

    res.json({
      success: true,
      message: "Inicio de sesión exitoso",
      data: {
        token,
        usuario: usuarioMapeado,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

module.exports = {
  login,
};
