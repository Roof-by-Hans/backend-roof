/**
 * Helper para emitir eventos de WebSocket relacionados con Mesas
 * Este archivo centraliza todas las emisiones de eventos para mantener consistencia
 */

const { getIO } = require('../../config/websocket');

const emitMesaCreada = (mesa) => {
  try {
    const io = getIO();
    io.to('mesas').emit('mesa:creada', {
      message: 'Nueva mesa creada',
      data: mesa,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al emitir mesa:creada:', error.message);
  }
};

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
  } catch (error) {
    console.error('Error al emitir mesa:actualizada:', error.message);
  }
};

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
  } catch (error) {
    console.error('Error al emitir mesa:eliminada:', error.message);
  }
};

const emitMesaEstadoCambiado = (idMesa, estadoData) => {
  try {
    const io = getIO();
    
    const payload = {
      message: 'Estado de mesa actualizado',
      data: { 
        id: idMesa,           // Number: ID de la mesa
        estado: estadoData.estado  // String: Estado en MAYÚSCULAS
      },
      timestamp: new Date().toISOString()   // ISO string para el frontend
    };
    
    // Emitir a la sala general de mesas
    io.to('mesas').emit('mesa:estado-cambiado', payload);
    
    // Emitir también a la sala específica de esta mesa
    io.to(`mesa:${idMesa}`).emit('mesa:estado-cambiado', payload);
  } catch (error) {
    console.error('Error al emitir mesa:estado-cambiado:', error.message);
  }
};

const emitMesasActualizadas = () => {
  try {
    const io = getIO();
    io.to('mesas').emit('mesas:actualizar', {
      message: 'Solicitud de actualización de mesas',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al emitir mesas:actualizar:', error.message);
  }
};

const emitMesasConGrupos = (mesas) => {
  try {
    const io = getIO();
    const payload = {
      message: `Lista de ${mesas.length} mesa(s) con información de grupos`,
      data: mesas,
      timestamp: new Date().toISOString()
    };

    io.to('mesas').emit('mesas:lista-completa', payload);
  } catch (error) {
    console.error('Error al emitir mesas:lista-completa:', error.message);
  }
};

const emitToMesa = (idMesa, evento, data) => {
  try {
    const io = getIO();
    io.to(`mesa:${idMesa}`).emit(evento, {
      ...data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error al emitir ${evento} a mesa ${idMesa}:`, error.message);
  }
};

const emitNotificacionMesas = (mensaje, tipo = 'info') => {
  try {
    const io = getIO();
    io.to('mesas').emit('notificacion', {
      message: mensaje,
      type: tipo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al emitir notificación:', error.message);
  }
};

const emitGrupoCreado = (grupo) => {
  try {
    const io = getIO();
    const payload = {
      message: `Grupo "${grupo.nombre}" creado con ${grupo.mesas.length} mesa(s)`,
      data: grupo,
      timestamp: new Date().toISOString()
    };

    io.to('mesas').emit('grupo:creado', payload);
  } catch (error) {
    console.error('Error al emitir grupo:creado:', error.message);
  }
};

const emitGrupoDisuelto = (idGrupo, mesasLiberadas = []) => {
  try {
    const io = getIO();
    const payload = {
      message: `Grupo disuelto - ${mesasLiberadas.length} mesa(s) liberada(s)`,
      data: {
        idGrupo,
        mesasLiberadas
      },
      timestamp: new Date().toISOString()
    };

    io.to('mesas').emit('grupo:disuelto', payload);
  } catch (error) {
    console.error('Error al emitir grupo:disuelto:', error.message);
  }
};

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
      timestamp: new Date().toISOString()
    };

    io.to('mesas').emit('mesas:unidas', payload);
  } catch (error) {
    console.error('Error al emitir mesas:unidas:', error.message);
  }
};

const emitMesasSeparadas = (data) => {
  try {
    const io = getIO();
    const payload = {
      message: `${data.mesasSeparadas.length} mesa(s) separada(s)`,
      data: {
        idGrupo: data.idGrupo,
        mesasSeparadas: data.mesasSeparadas
      },
      timestamp: new Date().toISOString()
    };

    io.to('mesas').emit('mesas:separadas', payload);
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
  emitMesasConGrupos,
  emitToMesa,
  emitNotificacionMesas,
  emitGrupoCreado,
  emitGrupoDisuelto,
  emitMesasUnidas,
  emitMesasSeparadas
};
