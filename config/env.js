require('dotenv').config();

const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET'
];

// Validar que todas las variables requeridas estén presentes
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`❌ Variables de entorno faltantes: ${missingVars.join(', ')}`);
}

// Exportar configuración estructurada
module.exports = {
  // Servidor
  port: process.env.PORT || 3000,
  serverUrl: process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`,
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  },

  // Bcrypt
  bcrypt: {
    saltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10
  },

  // Base de datos
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  }
};
