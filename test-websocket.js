/**
 * Script de prueba para WebSocket de Mesas
 * 
 * INSTRUCCIONES:
 * 1. Asegúrate de que el servidor backend esté corriendo (npm start)
 * 2. Obtén un token JWT válido haciendo login en /api/auth/login
 * 3. Reemplaza el TOKEN abajo con tu token
 * 4. Ejecuta: node test-websocket.js
 */

const io = require('socket.io-client');

// ⚠️ REEMPLAZA ESTE TOKEN CON UNO VÁLIDO
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Tu token aquí

const BACKEND_URL = 'http://localhost:3000';

console.log('🔌 Intentando conectar al servidor WebSocket...\n');

const socket = io(BACKEND_URL, {
  auth: {
    token: TOKEN
  },
  transports: ['websocket', 'polling']
});

// ===== EVENTOS DE CONEXIÓN =====

socket.on('connect', () => {
  console.log('✅ CONECTADO al servidor WebSocket');
  console.log(`📡 Socket ID: ${socket.id}\n`);
  
  // Unirse a la sala de mesas
  console.log('📤 Enviando: join:mesas');
  socket.emit('join:mesas');
});

socket.on('connect_error', (error) => {
  console.error('❌ ERROR DE CONEXIÓN:', error.message);
  console.log('\n💡 Verifica:');
  console.log('   1. El servidor está corriendo (npm start)');
  console.log('   2. El token JWT es válido');
  console.log('   3. El puerto 3000 está disponible\n');
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log(`\n🔌 DESCONECTADO: ${reason}`);
  process.exit(0);
});

// ===== EVENTOS DE MESAS =====

socket.on('joined:mesas', (data) => {
  console.log('✅ Unido a la sala de mesas');
  console.log('   Datos:', JSON.stringify(data, null, 2));
  
  // Solicitar clientes conectados
  console.log('\n📤 Solicitando clientes conectados...');
  socket.emit('mesas:get-connected-clients');
});

socket.on('left:mesas', (data) => {
  console.log('👋 Saliste de la sala de mesas');
  console.log('   Datos:', JSON.stringify(data, null, 2));
});

socket.on('mesas:connected-clients', (data) => {
  console.log('\n👥 CLIENTES CONECTADOS:');
  console.log(`   Total: ${data.count}`);
  data.clients.forEach((client, i) => {
    console.log(`   ${i + 1}. ID: ${client.id}, Usuario: ${client.userId}, Rol: ${client.userRole}`);
  });
  console.log('\n🎧 Escuchando eventos de mesas... (Ctrl+C para salir)\n');
});

// ===== EVENTOS DE CAMBIOS EN MESAS =====

socket.on('mesa:creada', (data) => {
  console.log('\n🆕 NUEVA MESA CREADA:');
  console.log('   Mensaje:', data.message);
  console.log('   Mesa:', JSON.stringify(data.data, null, 2));
  console.log('   Timestamp:', data.timestamp);
});

socket.on('mesa:actualizada', (data) => {
  console.log('\n🔄 MESA ACTUALIZADA:');
  console.log('   Mensaje:', data.message);
  console.log('   Mesa:', JSON.stringify(data.data, null, 2));
  console.log('   Timestamp:', data.timestamp);
});

socket.on('mesa:eliminada', (data) => {
  console.log('\n🗑️  MESA ELIMINADA:');
  console.log('   Mensaje:', data.message);
  console.log('   ID Mesa:', data.data.id);
  console.log('   Timestamp:', data.timestamp);
});

socket.on('mesa:estado-cambiado', (data) => {
  console.log('\n🔄 ESTADO DE MESA CAMBIADO:');
  console.log('   Mensaje:', data.message);
  console.log('   Mesa ID:', data.data.id);
  console.log('   Estado:', JSON.stringify(data.data.estado, null, 2));
  console.log('   Timestamp:', data.timestamp);
});

socket.on('mesas:actualizar', (data) => {
  console.log('\n🔄 ACTUALIZACIÓN MASIVA DE MESAS:');
  console.log('   Mensaje:', data.message);
  console.log('   Timestamp:', data.timestamp);
  console.log('   ⚠️  El frontend debería recargar la lista de mesas');
});

// ===== EVENTOS DE ERROR =====

socket.on('error', (data) => {
  console.error('\n❌ ERROR del servidor:');
  console.error('   Mensaje:', data.message);
  console.error('   Código:', data.code);
});

// ===== MANEJO DE SEÑALES =====

process.on('SIGINT', () => {
  console.log('\n\n👋 Cerrando conexión...');
  socket.emit('leave:mesas');
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 500);
});

console.log('💡 Tip: Mientras este script esté corriendo, puedes:');
console.log('   - Crear una mesa desde el frontend o API');
console.log('   - Actualizar una mesa');
console.log('   - Eliminar una mesa');
console.log('   - Cambiar el estado de una mesa');
console.log('   Y verás los eventos en tiempo real aquí\n');
