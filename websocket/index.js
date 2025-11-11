/**
 * Índice central de WebSocket
 * Facilita las importaciones de emitters desde cualquier parte del código
 */

// Emitters de Mesas
const mesasEmitter = require('./emitters/mesasEmitter');

// Aquí puedes exportar más emitters cuando los crees:
// const productosEmitter = require('./emitters/productosEmitter');
// const pedidosEmitter = require('./emitters/pedidosEmitter');
// const clientesEmitter = require('./emitters/clientesEmitter');

module.exports = {
  // Mesas
  ...mesasEmitter,
  
  // Productos
  // ...productosEmitter,
  
  // Pedidos
  // ...pedidosEmitter,
  
  // Clientes
  // ...clientesEmitter,
};
