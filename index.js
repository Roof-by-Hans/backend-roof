require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const { swaggerSpec } = require("./config/swagger");
const { testConnection } = require("./config/database");
const { handleMulterError } = require("./config/multer");
const authRoutes = require("./routes/authRoutes");
const authClienteRoutes = require("./routes/authClienteRoutes");
const clienteRoutes = require("./routes/clienteRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const categoriaProductoRoutes = require("./routes/categoriaProductoRoutes");
const tarjetaRoutes = require("./routes/tarjetaRoutes");
const tipoSuscripcionRoutes = require("./routes/tipoSuscripcionRoutes");
const nivelSuscripcionRoutes = require("./routes/nivelSuscripcionRoutes");
const productoRoutes = require("./routes/productoRoutes");
const mesaGrupoRoutes = require("./routes/mesaGrupoRoutes");
const mesaRoutes = require("./routes/mesaRoutes");
const cajaDiariaRoutes = require("./routes/cajaDiariaRoutes");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (imágenes) de forma pública
// Las imágenes estarán disponibles en: http://localhost:3000/uploads/{tipo}/{nombre-archivo}
// Ejemplos:
//   - http://localhost:3000/uploads/productos/producto-1234567890-123456789.jpg
//   - http://localhost:3000/uploads/usuarios/usuario-1234567890-123456789.jpg
//   - http://localhost:3000/uploads/clientes/cliente-1234567890-123456789.jpg
// Esto evita tener que hacer consultas al servidor por cada imagen
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api/auth", authRoutes);
app.use("/api/auth-cliente", authClienteRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/categorias-producto", categoriaProductoRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/tarjetas", tarjetaRoutes);
app.use("/api/tipos-suscripcion", tipoSuscripcionRoutes);
app.use("/api/niveles-suscripcion", nivelSuscripcionRoutes);
app.use("/api/mesas", mesaRoutes);
app.use("/api/mesas-grupo", mesaGrupoRoutes);
app.use("/api/caja-diaria", cajaDiariaRoutes);

app.get("/", (req, res) => {
  res.send("Backend Roof by Hans");
});

// Endpoint de información sobre carga de archivos
app.get("/api/file-upload-info", (req, res) => {
  res.json({
    success: true,
    message: "Información sobre carga de archivos disponible",
    info: {
      maxFileSize: "5MB",
      allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      uploadPaths: {
        productos: "/uploads/productos/",
        usuarios: "/uploads/usuarios/",
        clientes: "/uploads/clientes/"
      },
      fileFields: {
        productos: "imagen",
        usuarios: "fotoPerfil",
        clientes: "fotoPerfil"
      },
      endpoints: {
        productos: {
          create: "POST /api/productos",
          update: "PUT /api/productos/{id}"
        },
        usuarios: {
          create: "POST /api/usuarios", 
          update: "PUT /api/usuarios/{id}"
        },
        clientes: {
          create: "POST /api/clientes",
          update: "PUT /api/clientes/{id}"
        }
      }
    }
  });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    message: "La ruta solicitada no existe en este servidor",
  });
});

// Manejo de errores de multer
app.use(handleMulterError);

// Manejo de errores generales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Error interno del servidor",
    message: "Algo salió mal en el servidor",
  });
});

// Iniciar el servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(
    `📚 Documentación disponible en http://localhost:${PORT}/api-docs`
  );
  await testConnection();
});

module.exports = app;
