const jwt = require("jsonwebtoken");

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expirado",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token inválido",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error al verificar token",
    });
  }
};

module.exports = authClienteMiddleware;
