const mysql = require("mysql2");

// Configuración del pool de conexiones
const poolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  // Optimizaciones de rendimiento
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
};

const pool = mysql.createPool(poolConfig);

const promisePool = pool.promise();

const testConnection = async (retries = 10, delay = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const [rows] = await promisePool.execute("SELECT 1 as test");
      console.log("✅ Conexión a la base de datos establecida correctamente");
      return true;
    } catch (error) {
      console.warn(`⚠️ Intento ${attempt}/${retries}: Error al conectar con la base de datos: ${error.message}`);
      if (attempt < retries) {
        console.log(`⏳ Reintentando en ${delay/1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.error("❌ No se pudo conectar a la base de datos después de todos los intentos");
  return false;
};

module.exports = {
  pool,
  promisePool,
  testConnection,
};
