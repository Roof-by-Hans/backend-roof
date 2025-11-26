/**
 * Helper para emitir eventos de WebSocket relacionados con Pedidos
 * Este archivo centraliza todas las emisiones de eventos para mantener consistencia
 */

const { getIO } = require('../../config/websocket');

const emitPedidoCreado = (pedido) => {
  try {
    const io = getIO();
    io.to('pedidos').emit('pedido:creado', {
      message: 'Nuevo pedido creado',
      data: pedido,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al emitir pedido:creado:', error.message);
  }
};

const emitPedidoActualizado = (pedido) => {
  try {
    const io = getIO();
    io.to('pedidos').emit('pedido:actualizado', {
      message: 'Pedido actualizado',
      data: pedido,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al emitir pedido:actualizado:', error.message);
  }
};

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
  } catch (error) {
    console.error('Error al emitir pedido:eliminado:', error.message);
  }
};

const emitPedidoCobrado = (factura) => {
  try {
    const io = getIO();
    io.to('pedidos').emit('pedido:cobrado', {
      message: 'Pedido cobrado exitosamente',
      data: factura,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al emitir pedido:cobrado:', error.message);
  }
};

const emitPedidosLista = (pedidos) => {
  try {
    const io = getIO();
    io.to('pedidos').emit('pedidos:lista', {
      message: `Lista de ${pedidos.length} pedido(s) pendiente(s)`,
      data: pedidos,
      timestamp: new Date().toISOString()
    });
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
