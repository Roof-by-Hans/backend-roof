/**
 * Template para crear nuevos Emitters de WebSocket
 * 
 * INSTRUCCIONES:
 * 1. Copia este archivo y renómbralo según tu módulo (ej: productosEmitter.js)
 * 2. Reemplaza [MODULO] con el nombre de tu módulo (ej: Producto, Pedido, Cliente)
 * 3. Reemplaza [modulo] con la versión en minúscula (ej: producto, pedido, cliente)
 * 4. Agrega las funciones que necesites
 * 5. Exporta las funciones al final
 * 6. Registra en websocket/index.js
 */

const { getIO } = require('../../config/websocket');

/**
 * Emitir evento cuando se crea un [MODULO]
 * @param {Object} [modulo] - Datos del [modulo] creado
 */
const emit[Modulo]Creado = ([modulo]) => {
  try {
    const io = getIO();
    io.to('[modulo]s').emit('[modulo]:creado', {
      message: 'Nuevo [modulo] creado',
      data: [modulo],
      timestamp: new Date().toISOString()
    });
    console.log(`📤 Evento [modulo]:creado emitido para [modulo] ${[modulo].id}`);
  } catch (error) {
    console.error('Error al emitir [modulo]:creado:', error.message);
  }
};

/**
 * Emitir evento cuando se actualiza un [MODULO]
 * @param {Object} [modulo] - Datos del [modulo] actualizado
 */
const emit[Modulo]Actualizado = ([modulo]) => {
  try {
    const io = getIO();
    
    // Emitir a la sala general
    io.to('[modulo]s').emit('[modulo]:actualizado', {
      message: '[Modulo] actualizado',
      data: [modulo],
      timestamp: new Date().toISOString()
    });
    
    // Emitir también a la sala específica
    io.to(`[modulo]:${[modulo].id}`).emit('[modulo]:actualizado', {
      message: '[Modulo] actualizado',
      data: [modulo],
      timestamp: new Date().toISOString()
    });
    
    console.log(`📤 Evento [modulo]:actualizado emitido para [modulo] ${[modulo].id}`);
  } catch (error) {
    console.error('Error al emitir [modulo]:actualizado:', error.message);
  }
};

/**
 * Emitir evento cuando se elimina un [MODULO]
 * @param {Number} id[Modulo] - ID del [modulo] eliminado
 */
const emit[Modulo]Eliminado = (id[Modulo]) => {
  try {
    const io = getIO();
    
    // Emitir a la sala general
    io.to('[modulo]s').emit('[modulo]:eliminado', {
      message: '[Modulo] eliminado',
      data: { id: id[Modulo] },
      timestamp: new Date().toISOString()
    });
    
    // Emitir también a la sala específica
    io.to(`[modulo]:${id[Modulo]}`).emit('[modulo]:eliminado', {
      message: 'Este [modulo] ha sido eliminado',
      data: { id: id[Modulo] },
      timestamp: new Date().toISOString()
    });
    
    console.log(`📤 Evento [modulo]:eliminado emitido para [modulo] ${id[Modulo]}`);
  } catch (error) {
    console.error('Error al emitir [modulo]:eliminado:', error.message);
  }
};

/**
 * Emitir evento a un [MODULO] específico
 * @param {Number} id[Modulo] - ID del [modulo]
 * @param {String} evento - Nombre del evento
 * @param {Object} data - Datos a enviar
 */
const emitTo[Modulo] = (id[Modulo], evento, data) => {
  try {
    const io = getIO();
    io.to(`[modulo]:${id[Modulo]}`).emit(evento, {
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`📤 Evento ${evento} emitido a [modulo] ${id[Modulo]}`);
  } catch (error) {
    console.error(`Error al emitir ${evento} a [modulo] ${id[Modulo]}:`, error.message);
  }
};

/**
 * Emitir solicitud de actualización masiva
 */
const emit[Modulo]sActualizados = () => {
  try {
    const io = getIO();
    io.to('[modulo]s').emit('[modulo]s:actualizar', {
      message: 'Solicitud de actualización de [modulo]s',
      timestamp: new Date().toISOString()
    });
    console.log(`📤 Evento [modulo]s:actualizar emitido`);
  } catch (error) {
    console.error('Error al emitir [modulo]s:actualizar:', error.message);
  }
};

/**
 * Emitir notificación a todos los usuarios conectados a [modulo]s
 * @param {String} mensaje - Mensaje de notificación
 * @param {String} tipo - Tipo de notificación (info, warning, error, success)
 */
const emitNotificacion[Modulo]s = (mensaje, tipo = 'info') => {
  try {
    const io = getIO();
    io.to('[modulo]s').emit('notificacion', {
      message: mensaje,
      type: tipo,
      timestamp: new Date().toISOString()
    });
    console.log(`📤 Notificación emitida a sala de [modulo]s`);
  } catch (error) {
    console.error('Error al emitir notificación:', error.message);
  }
};

module.exports = {
  emit[Modulo]Creado,
  emit[Modulo]Actualizado,
  emit[Modulo]Eliminado,
  emitTo[Modulo],
  emit[Modulo]sActualizados,
  emitNotificacion[Modulo]s
};
