/**
 * Índice central de WebSocket
 * Facilita las importaciones de emitters desde cualquier parte del código
 */

// Emitters de Mesas
const mesasEmitter = require('./emitters/mesasEmitter');

// Emitters de Pedidos
const pedidosEmitter = require('./emitters/pedidosEmitter');

// Aquí puedes exportar más emitters cuando los crees:
// const productosEmitter = require('./emitters/productosEmitter');
// const clientesEmitter = require('./emitters/clientesEmitter');

module.exports = {
  // Mesas
  ...mesasEmitter,

  // Pedidos
  ...pedidosEmitter,
  
  // Productos
  // ...productosEmitter,
  
  // Clientes
  // ...clientesEmitter,
};
