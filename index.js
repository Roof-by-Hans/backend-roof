// Cargar configuración de entorno (centralizada)
require("./config/env");

const express = require("express");
const http = require("http");
const cors = require("cors");
const compression = require("compression");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const { swaggerSpec } = require("./config/swagger");
const { testConnection } = require("./config/database");
const { initializeWebSocket } = require("./config/websocket");
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
const movimientoCuentaRoutes = require("./routes/movimientoCuentaRoutes");
const facturaRoutes = require("./routes/facturaRoutes");
const transaccionRoutes = require("./routes/transaccionRoutes");
const mesaGrupoRoutes = require("./routes/mesaGrupoRoutes");
const mesaRoutes = require("./routes/mesaRoutes");
const cajaDiariaRoutes = require("./routes/cajaDiariaRoutes");
const mozoRoutes = require("./routes/mozoRoutes");
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Configurar CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Habilitar compresión HTTP (gzip/deflate)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Balance entre velocidad y compresión
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (imágenes) de forma pública
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/auth-cliente", authClienteRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/mozos", mozoRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/categorias-producto", categoriaProductoRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/tarjetas", tarjetaRoutes);
app.use("/api/tipos-suscripcion", tipoSuscripcionRoutes);
app.use("/api/niveles-suscripcion", nivelSuscripcionRoutes);
app.use("/api/movimientos-cuenta", movimientoCuentaRoutes);
app.use("/api/facturas", facturaRoutes);
app.use("/api/transacciones", transaccionRoutes);
app.use("/api/mesas", mesaRoutes);
app.use("/api/mesas-grupo", mesaGrupoRoutes);
app.use("/api/caja-diaria", cajaDiariaRoutes);

app.get("/", (req, res) => {
  res.send("Backend Roof by Hans");
});

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
        clientes: "/uploads/clientes/",
      },
      fileFields: {
        productos: "imagen",
        usuarios: "fotoPerfil",
        clientes: "fotoPerfil",
      },
      endpoints: {
        productos: {
          create: "POST /api/productos",
          update: "PUT /api/productos/{id}",
        },
        usuarios: {
          create: "POST /api/usuarios",
          update: "PUT /api/usuarios/{id}",
        },
        clientes: {
          create: "POST /api/clientes",
          update: "PUT /api/clientes/{id}",
        },
      },
    },
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    message: "La ruta solicitada no existe en este servidor",
  });
});

app.use(handleMulterError);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Error interno del servidor",
    message: "Algo salió mal en el servidor",
  });
});

const io = initializeWebSocket(server);

app.set("io", io);
console.log("🔌 WebSocket configurado y disponible en rutas");

server.listen(PORT, async () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(
    `📚 Documentación disponible en http://localhost:${PORT}/api-docs`
  );

  await testConnection();
});

module.exports = app;
