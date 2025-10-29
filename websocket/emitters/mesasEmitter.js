/**
 * Helper para emitir eventos de WebSocket relacionados con Mesas
 * Este archivo centraliza todas las emisiones de eventos para mantener consistencia
 */

const { getIO } = require('../../config/websocket');

/**
 * Emitir evento cuando se crea una mesa
 * @param {Object} mesa - Datos de la mesa creada (formato: { idMesa, nombreMesa, grupo })
 */
const emitMesaCreada = (mesa) => {
  try {
    const io = getIO();
    io.to('mesas').emit('mesa:creada', {
      message: 'Nueva mesa creada',
      data: mesa,
      timestamp: new Date().toISOString()
    });
    console.log(`📤 Evento mesa:creada emitido para mesa ${mesa.idMesa}`);
  } catch (error) {
    console.error('Error al emitir mesa:creada:', error.message);
  }
};

/**
 * Emitir evento cuando se actualiza una mesa
 * @param {Object} mesa - Datos de la mesa actualizada (formato: { idMesa, nombreMesa, grupo })
 */
const emitMesaActualizada = (mesa) => {
  try {
    const io = getIO();
    
    // Emitir a la sala general de mesas
    io.to('mesas').emit('mesa:actualizada', {
      message: 'Mesa actualizada',
      data: mesa,
      timestamp: new Date().toISOString()
    });
    
    // Emitir también a la sala específica de esta mesa
    io.to(`mesa:${mesa.idMesa}`).emit('mesa:actualizada', {
      message: 'Mesa actualizada',
      data: mesa,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📤 Evento mesa:actualizada emitido para mesa ${mesa.idMesa}`);
  } catch (error) {
    console.error('Error al emitir mesa:actualizada:', error.message);
  }
};

/**
 * Emitir evento cuando se elimina una mesa
 * @param {Number} idMesa - ID de la mesa eliminada
 */
const emitMesaEliminada = (idMesa) => {
  try {
    const io = getIO();
    
    // Emitir a la sala general de mesas
    io.to('mesas').emit('mesa:eliminada', {
      message: 'Mesa eliminada',
      data: { id: idMesa },
      timestamp: new Date().toISOString()
    });
    
    // Emitir también a la sala específica de esta mesa
    io.to(`mesa:${idMesa}`).emit('mesa:eliminada', {
      message: 'Esta mesa ha sido eliminada',
      data: { id: idMesa },
      timestamp: new Date().toISOString()
    });
    
    console.log(`📤 Evento mesa:eliminada emitido para mesa ${idMesa}`);
  } catch (error) {
    console.error('Error al emitir mesa:eliminada:', error.message);
  }
};

/**
 * Emitir evento cuando cambia el estado de ocupación de una mesa
 * @param {Number} idMesa - ID de la mesa
 * @param {Object} estado - Estado de la mesa (ocupada, disponible, reservada, etc.)
 */
const emitMesaEstadoCambiado = (idMesa, estado) => {
  try {
    const io = getIO();
    
    const payload = {
      message: 'Estado de mesa cambiado',
      data: { 
        id: idMesa, 
        estado 
      },
      timestamp: new Date().toISOString()
    };
    
    // Emitir a la sala general de mesas
    io.to('mesas').emit('mesa:estado-cambiado', payload);
    
    // Emitir también a la sala específica de esta mesa
    io.to(`mesa:${idMesa}`).emit('mesa:estado-cambiado', payload);
    
    console.log(`📤 Evento mesa:estado-cambiado emitido para mesa ${idMesa}`);
  } catch (error) {
    console.error('Error al emitir mesa:estado-cambiado:', error.message);
  }
};

/**
 * Emitir solicitud de actualización masiva de mesas
 * Útil cuando hay cambios que afectan a múltiples mesas
 */
const emitMesasActualizadas = () => {
  try {
    const io = getIO();
    io.to('mesas').emit('mesas:actualizar', {
      message: 'Solicitud de actualización de mesas',
      timestamp: new Date().toISOString()
    });
    console.log(`📤 Evento mesas:actualizar emitido`);
  } catch (error) {
    console.error('Error al emitir mesas:actualizar:', error.message);
  }
};

/**
 * Emitir evento a una mesa específica
 * @param {Number} idMesa - ID de la mesa
 * @param {String} evento - Nombre del evento
 * @param {Object} data - Datos a enviar
 */
const emitToMesa = (idMesa, evento, data) => {
  try {
    const io = getIO();
    io.to(`mesa:${idMesa}`).emit(evento, {
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`📤 Evento ${evento} emitido a mesa ${idMesa}`);
  } catch (error) {
    console.error(`Error al emitir ${evento} a mesa ${idMesa}:`, error.message);
  }
};

/**
 * Emitir notificación a todos los usuarios conectados a mesas
 * @param {String} mensaje - Mensaje de notificación
 * @param {String} tipo - Tipo de notificación (info, warning, error, success)
 */
const emitNotificacionMesas = (mensaje, tipo = 'info') => {
  try {
    const io = getIO();
    io.to('mesas').emit('notificacion', {
      message: mensaje,
      type: tipo,
      timestamp: new Date().toISOString()
    });
    console.log(`📤 Notificación emitida a sala de mesas`);
  } catch (error) {
    console.error('Error al emitir notificación:', error.message);
  }
};

module.exports = {
  emitMesaCreada,
  emitMesaActualizada,
  emitMesaEliminada,
  emitMesaEstadoCambiado,
  emitMesasActualizadas,
  emitToMesa,
  emitNotificacionMesas
};
