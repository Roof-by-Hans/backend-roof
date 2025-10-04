const swaggerJsdoc = require("swagger-jsdoc");

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Backend Roof by Hans API",
      version: "0.0.1",
      description: "API para el sistema de pagos internos de Hans",
    },
    servers: [
      {
        url:
          process.env.SERVER_URL ||
          `http://localhost:${process.env.PORT || 3000}`,
        description: "Servidor de desarrollo",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./index.js", "./routes/*.js"], // Rutas donde están las definiciones de Swagger
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = { swaggerSpec };
