/**
 * Template para crear nuevos Handlers de WebSocket
 * 
 * INSTRUCCIONES:
 * 1. Copia este archivo y renómbralo según tu módulo (ej: productosHandler.js)
 * 2. Reemplaza [MODULO] con el nombre de tu módulo (ej: Producto, Pedido, Cliente)
 * 3. Reemplaza [modulo] con la versión en minúscula (ej: producto, pedido, cliente)
 * 4. Agrega los eventos que necesites
 * 5. Registra en config/websocket.js
 */

/**
 * Handler de eventos WebSocket para [MODULO]S
 * 
 * @param {Object} io - Instancia de Socket.IO
 * @param {Object} socket - Socket del cliente conectado
 */
module.exports = (io, socket) => {
  
  /**
   * Evento: Unirse a la sala de [modulo]s
   */
  socket.on('join:[modulo]s', () => {
    socket.join('[modulo]s');
    console.log(`📡 Cliente ${socket.id} (Usuario: ${socket.userId}) se unió a la sala de [modulo]s`);
    
    socket.emit('joined:[modulo]s', { 
      message: 'Conectado a actualizaciones de [modulo]s',
      userId: socket.userId,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Evento: Salir de la sala de [modulo]s
   */
  socket.on('leave:[modulo]s', () => {
    socket.leave('[modulo]s');
    console.log(`📡 Cliente ${socket.id} salió de la sala de [modulo]s`);
    
    socket.emit('left:[modulo]s', { 
      message: 'Desconectado de actualizaciones de [modulo]s',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Evento: Obtener clientes conectados a la sala de [modulo]s
   */
  socket.on('[modulo]s:get-connected-clients', async () => {
    try {
      const sockets = await io.in('[modulo]s').fetchSockets();
      
      socket.emit('[modulo]s:connected-clients', {
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
   * Evento: Unirse a un [modulo] específico
   */
  socket.on('join:[modulo]', (data) => {
    const { [modulo]Id } = data;
    
    if (![modulo]Id) {
      return socket.emit('error', {
        message: 'ID de [modulo] requerido',
        code: '[MODULO]_ID_REQUIRED'
      });
    }

    const room = `[modulo]:${[modulo]Id}`;
    socket.join(room);
    console.log(`📡 Cliente ${socket.id} se unió a la sala del [modulo] ${[modulo]Id}`);
    
    socket.emit('joined:[modulo]', {
      message: `Conectado a actualizaciones del [modulo] ${[modulo]Id}`,
      [modulo]Id,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Evento: Salir de un [modulo] específico
   */
  socket.on('leave:[modulo]', (data) => {
    const { [modulo]Id } = data;
    
    if (![modulo]Id) {
      return socket.emit('error', {
        message: 'ID de [modulo] requerido',
        code: '[MODULO]_ID_REQUIRED'
      });
    }

    const room = `[modulo]:${[modulo]Id}`;
    socket.leave(room);
    console.log(`📡 Cliente ${socket.id} salió de la sala del [modulo] ${[modulo]Id}`);
    
    socket.emit('left:[modulo]', {
      message: `Desconectado de actualizaciones del [modulo] ${[modulo]Id}`,
      [modulo]Id,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Aquí puedes agregar más eventos personalizados para tu módulo
   * Ejemplos:
   * 
   * - Búsqueda en tiempo real
   * - Filtros dinámicos
   * - Actualizaciones parciales
   * - Notificaciones específicas
   */

  // Ejemplo: Solicitar listado de [modulo]s
  socket.on('[modulo]s:get-list', async (filters) => {
    try {
      // Aquí harías la consulta a la BD con los filtros
      // const [modulo]s = await get[Modulo]sFromDB(filters);
      
      socket.emit('[modulo]s:list', {
        data: [], // Reemplazar con datos reales
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error al obtener listado:', error);
      socket.emit('error', {
        message: 'Error al obtener listado de [modulo]s',
        code: 'GET_LIST_ERROR'
      });
    }
  });
};
