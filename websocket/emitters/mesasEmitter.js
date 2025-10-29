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
 * @param {Object} estadoData - Objeto con { estado, idClienteActual }
 */
const emitMesaEstadoCambiado = (idMesa, estadoData) => {
  try {
    const io = getIO();
    
    const payload = {
      message: 'Estado de mesa actualizado',
      data: { 
        id: idMesa,           // Number: ID de la mesa
        estado: estadoData.estado  // String: Estado en MAYÚSCULAS
      },
      timestamp: new Date()   // Date object para el frontend
    };
    
    // Emitir a la sala general de mesas
    io.to('mesas').emit('mesa:estado-cambiado', payload);
    
    // Emitir también a la sala específica de esta mesa
    io.to(`mesa:${idMesa}`).emit('mesa:estado-cambiado', payload);
    
    console.log(`📤 Evento mesa:estado-cambiado emitido para mesa ${idMesa} - Estado: ${estadoData.estado}`);
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

/**
 * Emitir evento cuando se crea un grupo de mesas
 * @param {Object} grupo - Datos del grupo creado { idGrupo, nombreGrupo, mesas: [...] }
 */
const emitGrupoCreado = (grupo) => {
  try {
    const io = getIO();
    const payload = {
      message: `Grupo "${grupo.nombre}" creado con ${grupo.mesas.length} mesa(s)`,
      data: grupo,
      timestamp: new Date()
    };

    io.to('mesas').emit('grupo:creado', payload);
    console.log(`📤 Evento grupo:creado emitido para grupo ${grupo.id}`);
  } catch (error) {
    console.error('Error al emitir grupo:creado:', error.message);
  }
};

/**
 * Emitir evento cuando se disuelve un grupo de mesas
 * @param {Number} idGrupo - ID del grupo disuelto
 * @param {Array} mesasLiberadas - Array de IDs de mesas que fueron liberadas del grupo
 */
const emitGrupoDisuelto = (idGrupo, mesasLiberadas = []) => {
  try {
    const io = getIO();
    const payload = {
      message: `Grupo disuelto - ${mesasLiberadas.length} mesa(s) liberada(s)`,
      data: {
        idGrupo,
        mesasLiberadas
      },
      timestamp: new Date()
    };

    io.to('mesas').emit('grupo:disuelto', payload);
    console.log(`📤 Evento grupo:disuelto emitido para grupo ${idGrupo}`);
  } catch (error) {
    console.error('Error al emitir grupo:disuelto:', error.message);
  }
};

/**
 * Emitir evento cuando mesas se unen a un grupo
 * @param {Object} data - { idGrupo, nombreGrupo, mesasUnidas: [id1, id2, ...] }
 */
const emitMesasUnidas = (data) => {
  try {
    const io = getIO();
    const payload = {
      message: `${data.mesasUnidas.length} mesa(s) unida(s) al grupo "${data.nombreGrupo}"`,
      data: {
        idGrupo: data.idGrupo,
        nombreGrupo: data.nombreGrupo,
        mesasUnidas: data.mesasUnidas
      },
      timestamp: new Date()
    };

    io.to('mesas').emit('mesas:unidas', payload);
    console.log(`📤 Evento mesas:unidas emitido - ${data.mesasUnidas.length} mesas al grupo ${data.idGrupo}`);
  } catch (error) {
    console.error('Error al emitir mesas:unidas:', error.message);
  }
};

/**
 * Emitir evento cuando mesas se separan de un grupo
 * @param {Object} data - { idGrupo, mesasSeparadas: [id1, id2, ...] }
 */
const emitMesasSeparadas = (data) => {
  try {
    const io = getIO();
    const payload = {
      message: `${data.mesasSeparadas.length} mesa(s) separada(s)`,
      data: {
        idGrupo: data.idGrupo,
        mesasSeparadas: data.mesasSeparadas
      },
      timestamp: new Date()
    };

    io.to('mesas').emit('mesas:separadas', payload);
    console.log(`📤 Evento mesas:separadas emitido - ${data.mesasSeparadas.length} mesas del grupo ${data.idGrupo}`);
  } catch (error) {
    console.error('Error al emitir mesas:separadas:', error.message);
  }
};

module.exports = {
  emitMesaCreada,
  emitMesaActualizada,
  emitMesaEliminada,
  emitMesaEstadoCambiado,
  emitMesasActualizadas,
  emitToMesa,
  emitNotificacionMesas,
  emitGrupoCreado,
  emitGrupoDisuelto,
  emitMesasUnidas,
  emitMesasSeparadas
};
