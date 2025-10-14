const { promisePool } = require("../config/database");
const {
  normalizeNombre,
  buildGrupoDetalle,
} = require("../models/mesaGrupoModel");

const sanitizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const respondError = (res, status, message, extra = {}) =>
  res.status(status).json({ success: false, message, ...extra });

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
    `SELECT m.id_mesa, m.nombre
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
      `SELECT mg.id_grupo, m.id_mesa, m.nombre
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

    const [result] = await promisePool.execute(
      `DELETE FROM GrupoMesas
        WHERE id_grupo = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return respondError(res, 404, "El grupo especificado no existe");
    }

    res.json({
      success: true,
      message: "Grupo eliminado correctamente",
      data: { id },
    });
  } catch (error) {
    console.error("Error al eliminar grupo de mesas:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

module.exports = {
  listarGruposConMesas,
  crearGrupo,
  obtenerGrupo,
  disolverGrupo,
};
