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
      schemas: {
        MulterError: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false
            },
            message: {
              type: "string",
              description: "Mensaje de error relacionado con la carga de archivos"
            }
          }
        }
      },
      responses: {
        FileUploadError: {
          description: "Error en la carga de archivos",
          content: {
            "application/json": {
              schema: {
                "$ref": "#/components/schemas/MulterError"
              },
              examples: {
                fileTooLarge: {
                  summary: "Archivo demasiado grande",
                  value: {
                    success: false,
                    message: "El archivo es demasiado grande. Máximo 5MB permitido."
                  }
                },
                invalidFileType: {
                  summary: "Tipo de archivo inválido",
                  value: {
                    success: false,
                    message: "Solo se permiten archivos de imagen (JPG, PNG, GIF, etc.)"
                  }
                },
                tooManyFiles: {
                  summary: "Demasiados archivos",
                  value: {
                    success: false,
                    message: "Demasiados archivos subidos."
                  }
                }
              }
            }
          }
        }
      }
    },
  },
  apis: ["./index.js", "./routes/*.js", "./config/multer-docs.js"], // Rutas donde están las definiciones de Swagger
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = { swaggerSpec };
