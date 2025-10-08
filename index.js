require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const { swaggerSpec } = require("./config/swagger");
const { testConnection } = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const authClienteRoutes = require("./routes/authClienteRoutes");
const clienteRoutes = require("./routes/clienteRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const categoriaProductoRoutes = require("./routes/categoriaProductoRoutes");
const tarjetaRoutes = require("./routes/tarjetaRoutes");
const tipoSuscripcionRoutes = require("./routes/tipoSuscripcionRoutes");
const nivelSuscripcionRoutes = require("./routes/nivelSuscripcionRoutes");
const productoRoutes = require("./routes/productoRoutes");
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

app.get("/", (req, res) => {
  res.send("Backend Roof by Hans");
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    message: "La ruta solicitada no existe en este servidor",
  });
});

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
