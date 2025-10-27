const { promisePool } = require("../config/database");
const { mapCajaDiariaRow } = require("../helpers/cajaDiariaMapper");

const respondError = (res, status, message, extra = {}) => {
  return res.status(status).json({
    success: false,
    message,
    ...extra,
  });
};

const parseMontoInicial = (value) => {
  if (value === undefined || value === null) {
    return 0;
  }

  const normalized = typeof value === "string" ? value.trim() : value;

  if (normalized === "") {
    return 0;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
};

const abrirCajaDiaria = async (req, res) => {
  const usuarioId = req.user?.id;

  if (!usuarioId) {
    return respondError(
      res,
      401,
      "No se encontró información del usuario en la sesión"
    );
  }

  const montoInicial = parseMontoInicial(
    req.body?.monto_inicial ?? req.body?.montoInicial
  );

  if (montoInicial === null) {
    return respondError(res, 400, "El monto inicial debe ser un número válido");
  }

  if (montoInicial < 0) {
    return respondError(res, 400, "El monto inicial no puede ser negativo");
  }

  let connection;

  try {
    connection = await promisePool.getConnection();
    await connection.beginTransaction();

    const [cajaAbiertaRows] = await connection.execute(
      `SELECT id_caja, fecha
         FROM CajaDiaria
        WHERE estado = 'ABIERTA'
        FOR UPDATE`
    );

    if (cajaAbiertaRows.length > 0) {
      await connection.rollback();
      return respondError(
        res,
        409,
        "Ya existe una caja diaria abierta. Debe cerrarla antes de abrir una nueva"
      );
    }

    const [insertResult] = await connection.execute(
      `INSERT INTO CajaDiaria (
         fecha,
         fecha_apertura,
         monto_inicial,
         estado,
         creado_por
       )
    VALUES (CURDATE(), NOW(), ?, 'ABIERTA', ?)`,
      [montoInicial, usuarioId]
    );

    const [nuevaCajaRows] = await connection.execute(
      `SELECT id_caja, fecha, fecha_apertura, fecha_cierre,
              monto_inicial, monto_final, estado, creado_por, cerrado_por
         FROM CajaDiaria
        WHERE id_caja = ?`,
      [insertResult.insertId]
    );

    await connection.commit();

    const caja = mapCajaDiariaRow(nuevaCajaRows[0]);

    return res.status(201).json({
      success: true,
      message: "Caja diaria abierta correctamente",
      data: caja,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Error al revertir la transacción de caja diaria:",
          rollbackError
        );
      }
    }

    if (error.code === "ER_DUP_ENTRY") {
      return respondError(
        res,
        409,
        "Ya existe una caja diaria registrada para la fecha actual"
      );
    }

    console.error("Error al abrir caja diaria:", error);
    return respondError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  abrirCajaDiaria,
};
