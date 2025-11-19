/**
 * Handler de eventos WebSocket para Pedidos
 * Este archivo maneja todos los eventos relacionados con pedidos en tiempo real
 * 
 * @param {Object} io - Instancia de Socket.IO
 * @param {Object} socket - Socket del cliente conectado
 */

module.exports = (io, socket) => {
  
  /**
   * Evento: Unirse a la sala de pedidos
   * El cliente recibirá actualizaciones en tiempo real de todos los pedidos
   */
  socket.on('join:pedidos', () => {
    socket.join('pedidos');
    console.log(`📡 Cliente ${socket.id} (Usuario: ${socket.userId}) se unió a la sala de pedidos`);
    
    socket.emit('joined:pedidos', { 
      success: true,
      message: 'Conectado a actualizaciones de pedidos en tiempo real',
      userId: socket.userId,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Evento: Salir de la sala de pedidos
   */
  socket.on('leave:pedidos', () => {
    socket.leave('pedidos');
    console.log(`📡 Cliente ${socket.id} salió de la sala de pedidos`);
    
    socket.emit('left:pedidos', { 
      message: 'Desconectado de actualizaciones de pedidos',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Evento: Cliente solicita crear un pedido
   * Reemite el evento a todos los demás clientes conectados
   */
  socket.on('pedido:crear', (data) => {
    console.log(`📥 Evento pedido:crear recibido del cliente ${socket.id}`, data);
    
    // Emitir a todos los clientes EXCEPTO al que lo envió
    socket.to('pedidos').emit('pedido:creado', {
      ...data,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📤 Evento pedido:creado emitido a otros clientes`);
  });

  /**
   * Evento: Cliente solicita actualizar un pedido
   * Reemite el evento a todos los demás clientes conectados
   */
  socket.on('pedido:actualizar', (data) => {
    console.log(`📥 Evento pedido:actualizar recibido del cliente ${socket.id}`, data);
    
    // Emitir a todos los clientes EXCEPTO al que lo envió
    socket.to('pedidos').emit('pedido:actualizado', {
      ...data,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📤 Evento pedido:actualizado emitido a otros clientes`);
  });

  /**
   * Evento: Cliente solicita eliminar un pedido
   * Reemite el evento a todos los demás clientes conectados
   */
  socket.on('pedido:eliminar', (data) => {
    console.log(`📥 Evento pedido:eliminar recibido del cliente ${socket.id}`, data);
    
    // Emitir a todos los clientes EXCEPTO al que lo envió
    socket.to('pedidos').emit('pedido:eliminado', {
      ...data,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📤 Evento pedido:eliminado emitido a otros clientes`);
  });

  /**
   * Evento: Cliente solicita cobrar un pedido
   * Reemite el evento a todos los demás clientes conectados
   */
  socket.on('pedido:cobrar', (data) => {
    console.log(`📥 Evento pedido:cobrar recibido del cliente ${socket.id}`, data);
    
    // Emitir a todos los clientes EXCEPTO al que lo envió
    socket.to('pedidos').emit('pedido:cobrado', {
      ...data,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📤 Evento pedido:cobrado emitido a otros clientes`);
  });

  /**
   * Evento: Obtener clientes conectados a la sala de pedidos
   * Útil para debugging o mostrar usuarios activos
   */
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
