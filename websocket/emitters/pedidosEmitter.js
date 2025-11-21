/**
 * Helper para emitir eventos de WebSocket relacionados con Pedidos
 * Este archivo centraliza todas las emisiones de eventos para mantener consistencia
 */

const { getIO } = require('../../config/websocket');

/**
 * Emitir evento cuando se crea un pedido
 * @param {Object} pedido - Datos del pedido creado
 */
const emitPedidoCreado = (pedido) => {
  try {
    const io = getIO();
    io.to('pedidos').emit('pedido:creado', {
      message: 'Nuevo pedido creado',
      data: pedido,
      timestamp: new Date().toISOString()
    });
    console.log(`📤 Evento pedido:creado emitido para pedido ${pedido.id || 'nuevo'}`);
  } catch (error) {
    console.error('Error al emitir pedido:creado:', error.message);
  }
};

/**
 * Emitir evento cuando se actualiza un pedido
 * @param {Object} pedido - Datos del pedido actualizado
 */
const emitPedidoActualizado = (pedido) => {
  try {
    const io = getIO();
    io.to('pedidos').emit('pedido:actualizado', {
      message: 'Pedido actualizado',
      data: pedido,
      timestamp: new Date().toISOString()
    });
    console.log(`📤 Evento pedido:actualizado emitido para pedido ${pedido.id}`);
  } catch (error) {
    console.error('Error al emitir pedido:actualizado:', error.message);
  }
};

/**
 * Emitir evento cuando se elimina un pedido
 * @param {String|Number} idPedido - ID del pedido eliminado
 * @param {Number} idMesa - ID de la mesa asociada (opcional)
 */
const emitPedidoEliminado = (idPedido, idMesa = null) => {
  try {
    const io = getIO();
    io.to('pedidos').emit('pedido:eliminado', {
      message: 'Pedido eliminado',
      data: { 
        id: idPedido,
        idMesa: idMesa
      },
      timestamp: new Date().toISOString()
    });
    console.log(`📤 Evento pedido:eliminado emitido para pedido ${idPedido}`);
  } catch (error) {
    console.error('Error al emitir pedido:eliminado:', error.message);
  }
};

/**
 * Emitir evento cuando se cobra un pedido
 * @param {Object} factura - Datos de la factura generada
 */
const emitPedidoCobrado = (factura) => {
  try {
    const io = getIO();
    io.to('pedidos').emit('pedido:cobrado', {
      message: 'Pedido cobrado exitosamente',
      data: factura,
      timestamp: new Date().toISOString()
    });
    console.log(`📤 Evento pedido:cobrado emitido para factura ${factura.id}`);
  } catch (error) {
    console.error('Error al emitir pedido:cobrado:', error.message);
  }
};

/**
 * Emitir lista completa de pedidos pendientes
 * @param {Array} pedidos - Array de pedidos pendientes
 */
const emitPedidosLista = (pedidos) => {
  try {
    const io = getIO();
    io.to('pedidos').emit('pedidos:lista', {
      message: `Lista de ${pedidos.length} pedido(s) pendiente(s)`,
      data: pedidos,
      timestamp: new Date().toISOString()
    });
    console.log(`📤 Evento pedidos:lista emitido con ${pedidos.length} pedido(s)`);
  } catch (error) {
    console.error('Error al emitir pedidos:lista:', error.message);
  }
};

module.exports = {
  emitPedidoCreado,
  emitPedidoActualizado,
  emitPedidoEliminado,
  emitPedidoCobrado,
  emitPedidosLista,
};
