const { promisePool } = require("../config/database");
const {
  normalizeNombre,
  buildGrupoDetalle,
  mapMesaConGrupoRows,
} = require("../models/mesaGrupoModel");
const {
  emitGrupoCreado,
  emitGrupoDisuelto,
  emitMesasUnidas,
  emitMesasSeparadas,
  emitMesasConGrupos,
} = require("../websocket"); // Importación para emitir eventos WebSocket

const sanitizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const respondError = (res, status, message, extra = {}) =>
  res.status(status).json({ success: false, message, ...extra });

/**
 * Obtener todas las mesas con información de grupos y emitir por WebSocket
 */
const emitirListaCompletaMesas = async () => {
  try {
    const [rows] = await promisePool.execute(
      `SELECT id_mesa, nombre_mesa, estado_mesa, id_cliente_actual, id_grupo, nombre_grupo, posX, posY
         FROM vw_mesas_con_grupo
        ORDER BY nombre_mesa`
    );
    const mesas = mapMesaConGrupoRows(rows);
    emitMesasConGrupos(mesas);
  } catch (error) {
    console.error('Error al emitir lista completa de mesas:', error);
  }
};

const cargarGrupoDetalle = async (idGrupo, connection = promisePool) => {
  const [grupoRows] = await connection.execute(
    `SELECT id_grupo, nombre
       FROM GrupoMesas
      WHERE id_grupo = ?`,
    [idGrupo]
  );

  if (grupoRows.length === 0) {
    return null;
  }

  const [mesasRows] = await connection.execute(
    `SELECT m.id_mesa, m.nombre, m.estado, m.id_cliente_actual, m.posX, m.posY
       FROM Mesa m
       INNER JOIN MesaGrupo mg ON mg.id_mesa = m.id_mesa
      WHERE mg.id_grupo = ?
      ORDER BY m.nombre`,
    [idGrupo]
  );

  return buildGrupoDetalle(grupoRows[0], mesasRows);
};

const listarGruposConMesas = async (req, res) => {
  try {
    const [gruposRows] = await promisePool.execute(
      `SELECT id_grupo, nombre
         FROM GrupoMesas
        ORDER BY nombre`
    );

    if (gruposRows.length === 0) {
      return res.json({
        success: true,
        message: "Grupos obtenidos correctamente",
        data: [],
      });
    }

    const grupoIds = gruposRows.map((row) => row.id_grupo);
    const placeholders = grupoIds.map(() => "?").join(", ");

    const [mesasRows] = await promisePool.execute(
      `SELECT mg.id_grupo, m.id_mesa, m.nombre, m.estado, m.id_cliente_actual, m.posX, m.posY
         FROM MesaGrupo mg
         INNER JOIN Mesa m ON m.id_mesa = mg.id_mesa
        WHERE mg.id_grupo IN (${placeholders})
        ORDER BY m.nombre`,
      grupoIds
    );

    const mesasPorGrupo = mesasRows.reduce((acc, mesaRow) => {
      const { id_grupo: idGrupo } = mesaRow;

      if (!acc[idGrupo]) {
        acc[idGrupo] = [];
      }

      acc[idGrupo].push(mesaRow);
      return acc;
    }, Object.create(null));

    const grupos = gruposRows
      .map((grupoRow) =>
        buildGrupoDetalle(grupoRow, mesasPorGrupo[grupoRow.id_grupo] || [])
      )
      .filter((grupo) => grupo !== null);

    res.json({
      success: true,
      message: "Grupos obtenidos correctamente",
      data: grupos,
    });
  } catch (error) {
    console.error("Error al listar grupos de mesas:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const crearGrupo = async (req, res) => {
  try {
    const { nombre, mesas } = req.body || {};

    const nombreNormalizado = normalizeNombre(nombre);

    if (!nombreNormalizado) {
      return respondError(res, 400, "El nombre del grupo es obligatorio");
    }

    const mesaIds = Array.isArray(mesas)
      ? Array.from(
          new Set(
            mesas
              .map((mesa) => Number(mesa))
              .filter((id) => Number.isInteger(id) && id > 0)
          )
        )
      : [];

    const connection = await promisePool.getConnection();

    try {
      await connection.beginTransaction();

      const [grupoResult] = await connection.execute(
        `INSERT INTO GrupoMesas (nombre)
         VALUES (?)`,
        [nombreNormalizado]
      );

      const idGrupo = grupoResult.insertId;

      if (mesaIds.length > 0) {
        const placeholders = mesaIds.map(() => "?").join(", ");

        const [mesasExistentes] = await connection.query(
          `SELECT id_mesa
             FROM Mesa
            WHERE id_mesa IN (${placeholders})`,
          mesaIds
        );

        const existentesSet = new Set(
          mesasExistentes.map((row) => row.id_mesa)
        );
        const faltantes = mesaIds.filter((id) => !existentesSet.has(id));

        if (faltantes.length > 0) {
          await connection.rollback();
          return respondError(res, 404, "Una o más mesas no existen", {
            detalles: { mesas: faltantes },
          });
        }

        const [mesasOcupadas] = await connection.query(
          `SELECT id_mesa, id_grupo
             FROM MesaGrupo
            WHERE id_mesa IN (${placeholders})`,
          mesaIds
        );

        if (mesasOcupadas.length > 0) {
          await connection.rollback();
          return respondError(
            res,
            409,
            "Una o más mesas ya pertenecen a otro grupo",
            {
              detalles: {
                mesas: mesasOcupadas.map((row) => ({
                  idMesa: row.id_mesa,
                  idGrupo: row.id_grupo,
                })),
              },
            }
          );
        }

        const values = mesaIds.flatMap((idMesa) => [idGrupo, idMesa]);
        const insertPlaceholders = mesaIds.map(() => "(?, ?)").join(", ");

        await connection.query(
          `INSERT INTO MesaGrupo (id_grupo, id_mesa)
           VALUES ${insertPlaceholders}`,
          values
        );
      }

      await connection.commit();

      const grupo = await cargarGrupoDetalle(idGrupo, connection);

      // Emitir eventos WebSocket específicos
      emitGrupoCreado(grupo);
      emitMesasUnidas({
        idGrupo: grupo.id,
        nombreGrupo: grupo.nombre,
        mesasUnidas: mesaIds
      });
      
      // Emitir lista completa actualizada de mesas con grupos
      await emitirListaCompletaMesas();

      res.status(201).json({
        success: true,
        message: "Grupo de mesas creado correctamente",
        data: grupo,
      });
    } catch (transactionError) {
      await connection.rollback();
      console.error(
        "Error en transacción al crear grupo de mesas:",
        transactionError
      );
      return respondError(
        res,
        transactionError.status || 500,
        transactionError.message || "Error interno del servidor",
        transactionError.details ? { detalles: transactionError.details } : {}
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error al crear grupo de mesas:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const obtenerGrupo = async (req, res) => {
  try {
    const id = sanitizeId(req.params.id);

    if (!id) {
      return respondError(res, 400, "El identificador del grupo no es válido");
    }

    const grupo = await cargarGrupoDetalle(id);

    if (!grupo) {
      return respondError(res, 404, "Grupo no encontrado");
    }

    res.json({
      success: true,
      message: "Grupo obtenido correctamente",
      data: grupo,
    });
  } catch (error) {
    console.error("Error al obtener grupo de mesas:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const disolverGrupo = async (req, res) => {
  try {
    const id = sanitizeId(req.params.id);

    if (!id) {
      return respondError(res, 400, "El identificador del grupo no es válido");
    }

    // Obtener las mesas del grupo antes de eliminarlo
    const [mesasDelGrupo] = await promisePool.execute(
      `SELECT id_mesa FROM MesaGrupo WHERE id_grupo = ?`,
      [id]
    );

    const mesasLiberadas = mesasDelGrupo.map(m => m.id_mesa);

    const [result] = await promisePool.execute(
      `DELETE FROM GrupoMesas
        WHERE id_grupo = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return respondError(res, 404, "El grupo especificado no existe");
    }

    // Emitir eventos WebSocket específicos
    emitGrupoDisuelto(id, mesasLiberadas);
    emitMesasSeparadas({
      idGrupo: id,
      mesasSeparadas: mesasLiberadas
    });
    
    // Emitir lista completa actualizada de mesas con grupos
    await emitirListaCompletaMesas();

    res.json({
      success: true,
      message: "Grupo eliminado correctamente",
      data: { id, mesasLiberadas },
    });
  } catch (error) {
    console.error("Error al eliminar grupo de mesas:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

/**
 * Agregar o remover mesas de un grupo existente
 * @param {Object} req.body - { agregar: [ids], remover: [ids] }
 */
const modificarMesasGrupo = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    const idGrupo = sanitizeId(req.params.id);
    const { agregar = [], remover = [] } = req.body || {};

    if (!idGrupo) {
      return respondError(res, 400, "El identificador del grupo no es válido");
    }

    // Validar que al menos una operación esté presente
    if (agregar.length === 0 && remover.length === 0) {
      return respondError(
        res,
        400,
        "Debe especificar mesas para agregar o remover"
      );
    }

    await connection.beginTransaction();

    // Verificar que el grupo existe
    const [grupoRows] = await connection.execute(
      `SELECT id_grupo, nombre FROM GrupoMesas WHERE id_grupo = ?`,
      [idGrupo]
    );

    if (grupoRows.length === 0) {
      await connection.rollback();
      return respondError(res, 404, "El grupo especificado no existe");
    }

    const nombreGrupo = grupoRows[0].nombre;
    const mesasAgregadas = [];
    const mesasRemovidas = [];

    // AGREGAR MESAS AL GRUPO
    if (agregar.length > 0) {
      // Validar que las mesas existen
      const placeholders = agregar.map(() => "?").join(", ");
      const [mesasExistentes] = await connection.execute(
        `SELECT id_mesa FROM Mesa WHERE id_mesa IN (${placeholders})`,
        agregar
      );

      if (mesasExistentes.length !== agregar.length) {
        await connection.rollback();
        return respondError(
          res,
          404,
          "Una o más mesas especificadas no existen"
        );
      }

      // Verificar que no estén ya en este grupo u otro grupo
      const [mesasEnGrupo] = await connection.execute(
        `SELECT id_mesa, id_grupo FROM MesaGrupo WHERE id_mesa IN (${placeholders})`,
        agregar
      );

      if (mesasEnGrupo.length > 0) {
        await connection.rollback();
        
        const mesasYaEnGrupo = mesasEnGrupo.filter(m => m.id_grupo === idGrupo);
        const mesasEnOtroGrupo = mesasEnGrupo.filter(m => m.id_grupo !== idGrupo);
        
        if (mesasEnOtroGrupo.length > 0) {
          return respondError(
            res,
            409,
            "Una o más mesas ya pertenecen a otro grupo",
            { mesasOcupadas: mesasEnOtroGrupo }
          );
        }
        
        if (mesasYaEnGrupo.length > 0) {
          return respondError(
            res,
            409,
            "Una o más mesas ya pertenecen a este grupo",
            { mesasYaEnGrupo: mesasYaEnGrupo.map(m => m.id_mesa) }
          );
        }
      }

      // Insertar las nuevas mesas en el grupo
      const values = agregar.flatMap((idMesa) => [idGrupo, idMesa]);
      const insertPlaceholders = agregar.map(() => "(?, ?)").join(", ");

      await connection.execute(
        `INSERT INTO MesaGrupo (id_grupo, id_mesa) VALUES ${insertPlaceholders}`,
        values
      );

      mesasAgregadas.push(...agregar);
    }

    // REMOVER MESAS DEL GRUPO
    if (remover.length > 0) {
      const placeholders = remover.map(() => "?").join(", ");
      
      // Verificar que las mesas están en este grupo
      const [mesasEnEsteGrupo] = await connection.execute(
        `SELECT id_mesa FROM MesaGrupo 
         WHERE id_grupo = ? AND id_mesa IN (${placeholders})`,
        [idGrupo, ...remover]
      );

      if (mesasEnEsteGrupo.length !== remover.length) {
        await connection.rollback();
        return respondError(
          res,
          404,
          "Una o más mesas no pertenecen a este grupo"
        );
      }

      // Verificar que no se quede el grupo vacío
      const [countMesas] = await connection.execute(
        `SELECT COUNT(*) as total FROM MesaGrupo WHERE id_grupo = ?`,
        [idGrupo]
      );

      const totalMesasEnGrupo = countMesas[0].total;
      
      if (totalMesasEnGrupo - remover.length === 0) {
        await connection.rollback();
        return respondError(
          res,
          400,
          "No se puede remover todas las mesas del grupo. Use DELETE para disolver el grupo."
        );
      }

      // Eliminar las mesas del grupo
      await connection.execute(
        `DELETE FROM MesaGrupo 
         WHERE id_grupo = ? AND id_mesa IN (${placeholders})`,
        [idGrupo, ...remover]
      );

      mesasRemovidas.push(...remover);
    }

    await connection.commit();

    // Obtener el grupo actualizado
    const grupoActualizado = await cargarGrupoDetalle(idGrupo);

    // Emitir eventos WebSocket
    if (mesasAgregadas.length > 0) {
      emitMesasUnidas({
        idGrupo,
        nombreGrupo,
        mesasUnidas: mesasAgregadas,
      });
    }

    if (mesasRemovidas.length > 0) {
      emitMesasSeparadas({
        idGrupo,
        mesasSeparadas: mesasRemovidas,
      });
    }

    // Emitir lista completa actualizada
    await emitirListaCompletaMesas();

    res.json({
      success: true,
      message: "Grupo modificado correctamente",
      data: {
        grupo: grupoActualizado,
        mesasAgregadas,
        mesasRemovidas,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al modificar mesas del grupo:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  listarGruposConMesas,
  crearGrupo,
  obtenerGrupo,
  disolverGrupo,
  modificarMesasGrupo,
};
