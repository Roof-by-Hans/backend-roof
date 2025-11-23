/**
 * Handler de eventos WebSocket para Mesas
 * Este archivo maneja todos los eventos relacionados con mesas en tiempo real
 *
 * @param {Object} io - Instancia de Socket.IO
 * @param {Object} socket - Socket del cliente conectado
 */

const { promisePool } = require("../../config/database");
const { mapMesaConGrupoRows } = require("../../helpers/mesaGrupoMapper");

/**
 * Obtener todas las mesas con información de grupos
 */
const obtenerMesasConGrupos = async () => {
  try {
    const [rows] = await promisePool.execute(
      `SELECT id_mesa, nombre_mesa, estado_mesa, id_cliente_actual, id_grupo, nombre_grupo, posX, posY
         FROM vw_mesas_con_grupo
        ORDER BY nombre_mesa`
    );
    return mapMesaConGrupoRows(rows);
  } catch (error) {
    console.error("Error al obtener mesas con grupos:", error);
    return [];
  }
};

module.exports = (io, socket) => {
  socket.on("join:mesas", async () => {
    socket.join("mesas");
    socket.join("mesas");

    // Enviar lista completa de mesas con grupos al cliente que se conecta
    const mesas = await obtenerMesasConGrupos();
    socket.emit("mesas:lista-completa", {
      message: `Lista inicial de ${mesas.length} mesa(s) con información de grupos`,
      data: mesas,
      timestamp: new Date(),
    });

    socket.emit("joined:mesas", {
      message: "Conectado a actualizaciones de mesas",
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("leave:mesas", () => {
    socket.leave("mesas");
    socket.leave("mesas");

    socket.emit("left:mesas", {
      message: "Desconectado de actualizaciones de mesas",
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("mesas:get-connected-clients", async () => {
    try {
      const sockets = await io.in("mesas").fetchSockets();

      socket.emit("mesas:connected-clients", {
        count: sockets.length,
        clients: sockets.map((s) => ({
          id: s.id,
          userId: s.userId,
          userRole: s.userRole,
        })),
      });
    } catch (error) {
      console.error("Error al obtener clientes conectados:", error);
      socket.emit("error", {
        message: "Error al obtener clientes conectados",
        code: "FETCH_CLIENTS_ERROR",
      });
    }
  });

  socket.on("join:mesa", (data) => {
    const { mesaId } = data;

    if (!mesaId) {
      return socket.emit("error", {
        message: "ID de mesa requerido",
        code: "MESA_ID_REQUIRED",
      });
    }

    const room = `mesa:${mesaId}`;
    socket.join(room);
    socket.join(room);

    socket.emit("joined:mesa", {
      message: `Conectado a actualizaciones de la mesa ${mesaId}`,
      mesaId,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("leave:mesa", (data) => {
    const { mesaId } = data;

    if (!mesaId) {
      return socket.emit("error", {
        message: "ID de mesa requerido",
        code: "MESA_ID_REQUIRED",
      });
    }

    const room = `mesa:${mesaId}`;
    socket.leave(room);
    socket.leave(room);

    socket.emit("left:mesa", {
      message: `Desconectado de actualizaciones de la mesa ${mesaId}`,
      mesaId,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("mesa:get-estado", async (data) => {
    const { mesaId } = data;

    if (!mesaId) {
      return socket.emit("error", {
        message: "ID de mesa requerido",
        code: "MESA_ID_REQUIRED",
      });
    }

    try {
      // Aquí podrías hacer una consulta a la base de datos si lo necesitas
      // Por ahora solo confirmamos que recibimos la solicitud
      socket.emit("mesa:estado", {
        mesaId,
        message: "Estado solicitado",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      socket.emit("error", {
        message: "Error al obtener estado de mesa",
        code: "GET_ESTADO_ERROR",
      });
    }
  });
};
