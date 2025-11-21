/**
 * Handler de eventos WebSocket para Pedidos
 * Este archivo maneja todos los eventos relacionados con pedidos en tiempo real
 * 
 * @param {Object} io - Instancia de Socket.IO
 * @param {Object} socket - Socket del cliente conectado
 */

module.exports = (io, socket) => {
  
  socket.on('join:pedidos', () => {
    socket.join('pedidos');
    socket.join('pedidos');
    
    socket.emit('joined:pedidos', { 
      success: true,
      message: 'Conectado a actualizaciones de pedidos en tiempo real',
      userId: socket.userId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('leave:pedidos', () => {
    socket.leave('pedidos');
    socket.leave('pedidos');
    
    socket.emit('left:pedidos', { 
      message: 'Desconectado de actualizaciones de pedidos',
      timestamp: new Date().toISOString()
    });
  });

  socket.on('pedido:crear', (data) => {
    
    // Emitir a todos los clientes EXCEPTO al que lo envió
    socket.to('pedidos').emit('pedido:creado', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('pedido:actualizar', (data) => {
    
    // Emitir a todos los clientes EXCEPTO al que lo envió
    socket.to('pedidos').emit('pedido:actualizado', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('pedido:eliminar', (data) => {
    
    // Emitir a todos los clientes EXCEPTO al que lo envió
    socket.to('pedidos').emit('pedido:eliminado', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('pedido:cobrar', (data) => {
    
    // Emitir a todos los clientes EXCEPTO al que lo envió
    socket.to('pedidos').emit('pedido:cobrado', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('pedidos:get-connected-clients', async () => {
    try {
      const sockets = await io.in('pedidos').fetchSockets();
      
      socket.emit('pedidos:connected-clients', {
        count: sockets.length,
        clients: sockets.map(s => ({
          id: s.id,
          userId: s.userId,
          userRole: s.userRole
        }))
      });
    } catch (error) {
      console.error('Error al obtener clientes conectados a pedidos:', error);
      socket.emit('error', { 
        message: 'Error al obtener clientes conectados',
        code: 'FETCH_CLIENTS_ERROR'
      });
    }
  });

};
