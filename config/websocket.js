const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Middleware de autenticación para WebSocket
 */
const socketAuthMiddleware = (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return next(new Error('Authentication error: Token no proporcionado'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.rol;
    socket.userName = decoded.nombre || 'Usuario';
    next();
  } catch (error) {
    next(new Error('Authentication error: Token inválido'));
  }
};

/**
 * Inicializar WebSocket con el servidor HTTP
 * Esta función configura Socket.IO y registra todos los handlers de eventos
 * @param {Object} server - Servidor HTTP de Express
 * @returns {Object} Instancia de Socket.IO
 */
const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // En producción, especifica los orígenes permitidos: ["https://tu-dominio.com"]
      methods: ["GET", "POST"],
      credentials: true
    },
    // Configuraciones adicionales para mejor rendimiento
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  // Aplicar middleware de autenticación
  io.use(socketAuthMiddleware);

  // Manejo de conexiones
  io.on('connection', (socket) => {
    console.log(`✅ Cliente conectado: ${socket.id} (Usuario: ${socket.userId}, Rol: ${socket.userRole})`);

    // Registrar handlers de diferentes módulos de forma escalable
    // Cada handler se encarga de sus propios eventos
    require('../websocket/handlers/mesasHandler')(io, socket);
    
    // Aquí puedes agregar más handlers para otros módulos:
    // require('../websocket/handlers/productosHandler')(io, socket);
    // require('../websocket/handlers/pedidosHandler')(io, socket);
    // require('../websocket/handlers/clientesHandler')(io, socket);
    // require('../websocket/handlers/notificacionesHandler')(io, socket);

    // Manejo de desconexión
    socket.on('disconnect', (reason) => {
      console.log(`❌ Cliente desconectado: ${socket.id} - Razón: ${reason}`);
    });

    // Manejo de errores
    socket.on('error', (error) => {
      console.error(`⚠️ Error en socket ${socket.id}:`, error);
    });
  });

  console.log('🔌 WebSocket inicializado correctamente');
  return io;
};

/**
 * Obtener la instancia de Socket.IO
 * @returns {Object} Instancia de Socket.IO
 * @throws {Error} Si Socket.IO no ha sido inicializado
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO no ha sido inicializado. Llama a initializeWebSocket primero.');
  }
  return io;
};

module.exports = {
  initializeWebSocket,
  getIO
};
