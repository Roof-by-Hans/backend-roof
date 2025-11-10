const { verifyToken } = require("../helpers/jwt");

const authClienteMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Token de autenticación no proporcionado",
      });
    }

    const token = authHeader.split(" ")[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token de autenticación no válido",
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

    // Verificar que el token sea de un cliente
    if (decoded.tipo !== "cliente") {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado. Este endpoint es exclusivo para clientes",
      });
    }

    req.cliente = decoded;
    next();
  } catch (error) {
    console.error("Error en autenticación de cliente:", error);
    return res.status(500).json({
      success: false,
      message: "Error al verificar token",
      error: error.message,
    });
  }
};

module.exports = authClienteMiddleware;
