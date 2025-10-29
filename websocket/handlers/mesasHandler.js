/**
 * Handler de eventos WebSocket para Mesas
 * Este archivo maneja todos los eventos relacionados con mesas en tiempo real
 * 
 * @param {Object} io - Instancia de Socket.IO
 * @param {Object} socket - Socket del cliente conectado
 */
module.exports = (io, socket) => {
  
  /**
   * Evento: Unirse a la sala de mesas
   * El cliente recibirá actualizaciones en tiempo real de todas las mesas
   */
  socket.on('join:mesas', () => {
    socket.join('mesas');
    console.log(`📡 Cliente ${socket.id} (Usuario: ${socket.userId}) se unió a la sala de mesas`);
    
    socket.emit('joined:mesas', { 
      message: 'Conectado a actualizaciones de mesas',
      userId: socket.userId,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Evento: Salir de la sala de mesas
   */
  socket.on('leave:mesas', () => {
    socket.leave('mesas');
    console.log(`📡 Cliente ${socket.id} salió de la sala de mesas`);
    
    socket.emit('left:mesas', { 
      message: 'Desconectado de actualizaciones de mesas',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Evento: Obtener clientes conectados a la sala de mesas
   * Útil para debugging o mostrar usuarios activos
   */
  socket.on('mesas:get-connected-clients', async () => {
    try {
      const sockets = await io.in('mesas').fetchSockets();
      
      socket.emit('mesas:connected-clients', {
        count: sockets.length,
        clients: sockets.map(s => ({
          id: s.id,
          userId: s.userId,
          userRole: s.userRole
        }))
      });
    } catch (error) {
      console.error('Error al obtener clientes conectados:', error);
      socket.emit('error', { 
        message: 'Error al obtener clientes conectados',
        code: 'FETCH_CLIENTS_ERROR'
      });
    }
  });

  /**
   * Evento: Unirse a una mesa específica
   * Permite recibir actualizaciones de una mesa en particular
   */
  socket.on('join:mesa', (data) => {
    const { mesaId } = data;
    
    if (!mesaId) {
      return socket.emit('error', {
        message: 'ID de mesa requerido',
        code: 'MESA_ID_REQUIRED'
      });
    }

    const room = `mesa:${mesaId}`;
    socket.join(room);
    console.log(`📡 Cliente ${socket.id} se unió a la sala de la mesa ${mesaId}`);
    
    socket.emit('joined:mesa', {
      message: `Conectado a actualizaciones de la mesa ${mesaId}`,
      mesaId,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Evento: Salir de una mesa específica
   */
  socket.on('leave:mesa', (data) => {
    const { mesaId } = data;
    
    if (!mesaId) {
      return socket.emit('error', {
        message: 'ID de mesa requerido',
        code: 'MESA_ID_REQUIRED'
      });
    }

    const room = `mesa:${mesaId}`;
    socket.leave(room);
    console.log(`📡 Cliente ${socket.id} salió de la sala de la mesa ${mesaId}`);
    
    socket.emit('left:mesa', {
      message: `Desconectado de actualizaciones de la mesa ${mesaId}`,
      mesaId,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Evento: Solicitar el estado actual de una mesa
   */
  socket.on('mesa:get-estado', async (data) => {
    const { mesaId } = data;
    
    if (!mesaId) {
      return socket.emit('error', {
        message: 'ID de mesa requerido',
        code: 'MESA_ID_REQUIRED'
      });
    }

    try {
      // Aquí podrías hacer una consulta a la base de datos si lo necesitas
      // Por ahora solo confirmamos que recibimos la solicitud
      socket.emit('mesa:estado', {
        mesaId,
        message: 'Estado solicitado',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      socket.emit('error', {
        message: 'Error al obtener estado de mesa',
        code: 'GET_ESTADO_ERROR'
      });
    }
  });
};
