const { promisePool } = require("../config/database");
const { verifyToken } = require("../helpers/jwt");
const { obtenerRolesUsuario } = require("../helpers/rolHelper");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token de autenticación no proporcionado",
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (tokenError) {
      if (tokenError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expirado. Por favor, inicie sesión nuevamente",
          expired: true,
        });
      }
      if (tokenError.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Token inválido",
        });
      }
      throw tokenError;
    }

    // Verificar que el token no sea de un cliente
    if (decoded.tipo === "cliente") {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado. Este endpoint es exclusivo para usuarios del sistema",
      });
    }

    const [rows] = await promisePool.execute(
      `SELECT id_usuario, nombre_usuario, activo
       FROM Usuario
       WHERE id_usuario = ?`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const usuario = rows[0];

    if (!usuario.activo) {
      return res.status(401).json({
        success: false,
        message: "La sesión no está activa",
      });
    }

    const roles = await obtenerRolesUsuario(usuario.id_usuario);
    const roleNames = roles.map((rol) => rol.nombre);

    req.user = {
      id: usuario.id_usuario,
      nombreUsuario: usuario.nombre_usuario,
      roles: roleNames,
    };

    next();
  } catch (error) {
    console.error("Error en autenticación:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

const authorizeAdmin = (req, res, next) => {
  const roles = req.user?.roles || [];

  if (!roles.includes("Administrador")) {
    return res.status(403).json({
      success: false,
      message: "No tiene permisos para realizar esta acción",
    });
  }

  next();
};

module.exports = {
  authenticate,
  authorizeAdmin,
};
