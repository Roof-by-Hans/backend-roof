const { promisePool } = require("../config/database");
const { mapCajaDiariaRow } = require("../helpers/cajaDiariaMapper");

const respondError = (res, status, message, extra = {}) => {
  return res.status(status).json({
    success: false,
    message,
    ...extra,
  });
};

const roundCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.round(num * 100) / 100;
};

const parseDecimalField = (
  value,
  { fieldName, required = false, defaultValue = null, allowNegative = true }
) => {
  if (value === undefined || value === null) {
    if (required) {
      return { error: `El campo ${fieldName} es obligatorio` };
    }
    return { value: defaultValue };
  }

  const normalized = typeof value === "string" ? value.trim() : value;

  if (normalized === "") {
    if (required) {
      return { error: `El campo ${fieldName} es obligatorio` };
    }
    return { value: defaultValue };
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return {
      error: `El campo ${fieldName} debe ser un número válido`,
    };
  }

  if (!allowNegative && parsed < 0) {
    return {
      error: `El campo ${fieldName} no puede ser negativo`,
    };
  }

  return { value: roundCurrency(parsed) };
};

const parseMontoInicial = (value) => {
  const { value: parsed, error } = parseDecimalField(value, {
    fieldName: "monto inicial",
    required: false,
    defaultValue: 0,
    allowNegative: false,
  });

  return error ? null : parsed ?? 0;
};

const buildAuditoriaObservacion = (
  observacion,
  { conteoEfectivo, conteoTarjetas, subtotalesPorMedio }
) => {
  const lines = [];

  if (observacion && typeof observacion === "string") {
    const trimmed = observacion.trim();
    if (trimmed) {
      lines.push(trimmed);
    }
  }

  const extras = {};

  if (conteoEfectivo !== null && conteoEfectivo !== undefined) {
    extras.conteoEfectivo = roundCurrency(conteoEfectivo);
  }

  if (conteoTarjetas !== null && conteoTarjetas !== undefined) {
    extras.conteoTarjetas = roundCurrency(conteoTarjetas);
  }

  if (Array.isArray(subtotalesPorMedio) && subtotalesPorMedio.length > 0) {
    extras.subtotalesPorMedio = subtotalesPorMedio;
  }

  if (Object.keys(extras).length > 0) {
    const serialized = JSON.stringify(extras);
    lines.push(`Detalle cierre: ${serialized}`);
  }

  return lines.join("\n");
};

const sanitizeSubtotales = (subtotales) => {
  if (!Array.isArray(subtotales)) {
    return { value: [] };
  }

  const cleaned = [];

  for (const item of subtotales) {
    if (typeof item !== "object" || item === null) {
      return {
        error: "Cada subtotal por medio de pago debe ser un objeto válido",
      };
    }

    const id = Number(item.idMedioPago ?? item.id_medio_pago);

    if (!Number.isInteger(id) || id <= 0) {
      return {
        error: "Cada subtotal debe incluir un idMedioPago numérico válido",
      };
    }

    const { value: monto, error } = parseDecimalField(item.monto, {
      fieldName: "monto del subtotal",
      required: true,
      allowNegative: false,
    });

    if (error) {
      return { error };
    }

    cleaned.push({ idMedioPago: id, monto });
  }

  return { value: cleaned };
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

const cerrarCajaDiaria = async (req, res) => {
  const usuarioId = req.user?.id;

  if (!usuarioId) {
    return respondError(
      res,
      401,
      "No se encontró información del usuario en la sesión"
    );
  }

  const {
    montoFinalReportado,
    observacion,
    conteoEfectivo,
    conteoTarjetas,
    subtotalesPorMedio,
  } = req.body || {};

  const montoFinalResult = parseDecimalField(montoFinalReportado, {
    fieldName: "montoFinalReportado",
    required: true,
    allowNegative: false,
  });

  if (montoFinalResult.error) {
    return respondError(res, 400, montoFinalResult.error);
  }

  const conteoEfectivoResult = parseDecimalField(conteoEfectivo, {
    fieldName: "conteoEfectivo",
    allowNegative: false,
  });

  if (conteoEfectivoResult.error) {
    return respondError(res, 400, conteoEfectivoResult.error);
  }

  const conteoTarjetasResult = parseDecimalField(conteoTarjetas, {
    fieldName: "conteoTarjetas",
    allowNegative: false,
  });

  if (conteoTarjetasResult.error) {
    return respondError(res, 400, conteoTarjetasResult.error);
  }

  const subtotalesResult = sanitizeSubtotales(subtotalesPorMedio);

  if (subtotalesResult.error) {
    return respondError(res, 400, subtotalesResult.error);
  }

  let connection;

  try {
    connection = await promisePool.getConnection();
    await connection.beginTransaction();

    const [cajaRows] = await connection.execute(
      `SELECT id_caja, fecha, monto_inicial, monto_final, estado, creado_por
         FROM CajaDiaria
        WHERE estado = 'ABIERTA'
        FOR UPDATE`
    );

    if (cajaRows.length === 0) {
      await connection.rollback();
      return respondError(
        res,
        409,
        "No existe una caja diaria abierta para cerrar"
      );
    }

    const cajaActual = cajaRows[0];
    const idCaja = cajaActual.id_caja;
    const montoInicialCaja = roundCurrency(cajaActual.monto_inicial || 0);

    const [totalesRows] = await connection.execute(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE 0 END), 0) AS total_ingresos,
         COALESCE(SUM(CASE WHEN tipo = 'EGRESO' THEN monto ELSE 0 END), 0) AS total_egresos,
         COALESCE(SUM(CASE WHEN tipo = 'AJUSTE' THEN monto ELSE 0 END), 0) AS total_ajustes
       FROM MovimientoCaja
       WHERE id_caja = ?`,
      [idCaja]
    );

    const totales = totalesRows[0] || {};
    const totalIngresos = roundCurrency(totales.total_ingresos || 0);
    const totalEgresos = roundCurrency(totales.total_egresos || 0);
    const totalAjustes = roundCurrency(totales.total_ajustes || 0);

    const totalDiaBase = roundCurrency(
      totalIngresos - totalEgresos + totalAjustes
    );
    const montoCalculadoBase = roundCurrency(montoInicialCaja + totalDiaBase);

    const montoFinal = montoFinalResult.value ?? 0;
    const diferenciaOriginal = roundCurrency(montoFinal - montoCalculadoBase);

    let ajusteGenerado = null;
    let totalAjustesFinal = totalAjustes;

    if (diferenciaOriginal !== 0) {
      const [ajusteResult] = await connection.execute(
        `INSERT INTO MovimientoCaja (
           id_caja,
           tipo,
           monto,
           concepto,
           id_usuario
         )
         VALUES (?, 'AJUSTE', ?, 'Ajuste automático por diferencia de cierre', ?)`,
        [idCaja, diferenciaOriginal, usuarioId]
      );

      ajusteGenerado = {
        idMovimiento: ajusteResult.insertId,
        monto: diferenciaOriginal,
      };

      totalAjustesFinal = roundCurrency(totalAjustes + diferenciaOriginal);
    }

    const totalDia = roundCurrency(
      totalIngresos - totalEgresos + totalAjustesFinal
    );
    const montoCalculado = roundCurrency(montoInicialCaja + totalDia);
    const diferenciaFinal = roundCurrency(montoFinal - montoCalculado);

    if (Math.abs(diferenciaFinal) >= 0.01) {
      throw new Error(
        "No se pudo balancear la caja automáticamente. Revise los movimientos de ajuste"
      );
    }

    const auditoriaObservacion = buildAuditoriaObservacion(observacion, {
      conteoEfectivo: conteoEfectivoResult.value,
      conteoTarjetas: conteoTarjetasResult.value,
      subtotalesPorMedio: subtotalesResult.value,
    });

    await connection.execute(
      `INSERT INTO AuditoriaCaja (
         id_caja,
         monto_inicial,
         total_dia,
         monto_calculado,
         monto_final,
         diferencia,
         id_usuario,
         observacion
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idCaja,
        montoInicialCaja,
        totalDia,
        montoCalculado,
        montoFinal,
        diferenciaOriginal,
        usuarioId,
        auditoriaObservacion || null,
      ]
    );

    await connection.execute(
      `UPDATE CajaDiaria
          SET monto_final = ?,
              fecha_cierre = NOW(),
              estado = 'CERRADA',
              cerrado_por = ?
        WHERE id_caja = ?`,
      [montoFinal, usuarioId, idCaja]
    );

    const [cajaActualizadaRows] = await connection.execute(
      `SELECT id_caja, fecha, fecha_apertura, fecha_cierre,
              monto_inicial, monto_final, estado, creado_por, cerrado_por
         FROM CajaDiaria
        WHERE id_caja = ?`,
      [idCaja]
    );

    await connection.commit();

    const caja = mapCajaDiariaRow(cajaActualizadaRows[0]);

    return res.json({
      success: true,
      message: "Caja diaria cerrada correctamente",
      data: {
        caja,
        auditoria: {
          montoInicial: montoInicialCaja,
          totalDia,
          montoCalculado,
          montoFinal,
          diferencia: diferenciaOriginal,
          observacion: auditoriaObservacion || null,
        },
        totalesMovimientos: {
          ingresos: totalIngresos,
          egresos: totalEgresos,
          ajustes: totalAjustesFinal,
        },
        ajusteGenerado,
        conteos: {
          efectivo: conteoEfectivoResult.value,
          tarjetas: conteoTarjetasResult.value,
          subtotales: subtotalesResult.value,
        },
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Error al revertir la transacción de cierre de caja diaria:",
          rollbackError
        );
      }
    }

    console.error("Error al cerrar caja diaria:", error);
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
  cerrarCajaDiaria,
};
