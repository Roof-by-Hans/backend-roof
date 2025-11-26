const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Middleware de autenticación opcional para WebSocket
 * Si hay token lo valida, si no hay, permite la conexión sin autenticar
 */
const socketAuthMiddleware = (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
  
  // Si no hay token, permitir conexión anónima
  if (!token) {
    socket.userId = null;
    socket.userRole = 'guest';
    socket.userName = 'Invitado';
    socket.isAuthenticated = false;
    return next();
  }

  // Si hay token, intentar validarlo
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.rol;
    socket.userName = decoded.nombre || 'Usuario';
    socket.isAuthenticated = true;
    next();
  } catch (error) {
    // Si el token es inválido, permitir como invitado
    socket.userId = null;
    socket.userRole = 'guest';
    socket.userName = 'Invitado';
    socket.isAuthenticated = false;
    next();
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
    transports: ['websocket', 'polling'],
    // Compresión de mensajes WebSocket
    perMessageDeflate: {
      threshold: 1024 // Comprimir mensajes mayores a 1KB
    },
    maxHttpBufferSize: 1e6, // 1MB
    allowEIO3: true
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log(`✅ WebSocket: Cliente conectado (ID: ${socket.id})`);

    // Registrar handlers (solo una vez cada uno)
    require('../websocket/handlers/mesasHandler')(io, socket);
    require('../websocket/handlers/pedidosHandler')(io, socket);

    // Manejo de errores de conexión
    socket.on("error", (error) => {
      console.error(`❌ WebSocket error (ID: ${socket.id}):`, error.message);
    });

    // Manejo de desconexión
    socket.on("disconnect", (reason) => {
      console.log(`🔌 WebSocket: Cliente desconectado (ID: ${socket.id}, Razón: ${reason})`);
    });

    // Validar estructura de mensajes personalizados
    socket.on("message", (data) => {
      try {
        if (!data || typeof data !== 'object') {
          console.warn(`⚠️ WebSocket: Mensaje inválido recibido de ${socket.id}`);
          return;
        }
        // Procesar mensaje válido aquí si es necesario
        console.log(`📨 WebSocket: Mensaje recibido de ${socket.id}:`, data);
      } catch (error) {
        console.error(`❌ WebSocket: Error procesando mensaje de ${socket.id}:`, error.message);
      }
    });
  });

  console.log('✅ WebSocket inicializado correctamente');
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
