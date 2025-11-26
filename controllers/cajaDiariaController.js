const { promisePool } = require("../config/database");
const { mapCajaDiariaRow } = require("../helpers/cajaDiariaMapper");
const {
  roundCurrency,
  parseDecimalField,
  sanitizeSubtotales,
} = require("../helpers/numberHelper");
const { enviarError, enviarExito } = require("../helpers/responseHelpers");
const { withTransaction } = require("../helpers/transactionHelper");

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

const abrirCajaDiaria = async (req, res) => {
  const usuarioId = req.user?.id;

  if (!usuarioId) {
    return enviarError(
      res,
      401,
      "No se encontró información del usuario en la sesión"
    );
  }

  const montoInicial = parseMontoInicial(
    req.body?.monto_inicial ?? req.body?.montoInicial
  );

  if (montoInicial === null) {
    return enviarError(res, 400, "El monto inicial debe ser un número válido");
  }

  if (montoInicial < 0) {
    return enviarError(res, 400, "El monto inicial no puede ser negativo");
  }

  try {
    const caja = await withTransaction(async (connection) => {
      const [cajaAbiertaRows] = await connection.execute(
        `SELECT id_caja, fecha
           FROM CajaDiaria
          WHERE estado = 'ABIERTA'
          FOR UPDATE`
      );

      if (cajaAbiertaRows.length > 0) {
        const error = new Error(
          "Ya existe una caja diaria abierta. Debe cerrarla antes de abrir una nueva"
        );
        error.statusCode = 409;
        throw error;
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

      return mapCajaDiariaRow(nuevaCajaRows[0]);
    });

    return enviarExito(res, caja, "Caja diaria abierta correctamente", 201);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return enviarError(
        res,
        409,
        "Ya existe una caja diaria registrada para la fecha actual"
      );
    }

    if (error.statusCode) {
      return enviarError(res, error.statusCode, error.message);
    }

    console.error("Error al abrir caja diaria:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const cerrarCajaDiaria = async (req, res) => {
  const usuarioId = req.user?.id;

  if (!usuarioId) {
    return enviarError(
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
    return enviarError(res, 400, montoFinalResult.error);
  }

  const conteoEfectivoResult = parseDecimalField(conteoEfectivo, {
    fieldName: "conteoEfectivo",
    allowNegative: false,
  });

  if (conteoEfectivoResult.error) {
    return enviarError(res, 400, conteoEfectivoResult.error);
  }

  const conteoTarjetasResult = parseDecimalField(conteoTarjetas, {
    fieldName: "conteoTarjetas",
    allowNegative: false,
  });

  if (conteoTarjetasResult.error) {
    return enviarError(res, 400, conteoTarjetasResult.error);
  }

  const subtotalesResult = sanitizeSubtotales(subtotalesPorMedio);

  if (subtotalesResult.error) {
    return enviarError(res, 400, subtotalesResult.error);
  }

  try {
    const resultado = await withTransaction(async (connection) => {
      const [cajaRows] = await connection.execute(
        `SELECT id_caja, fecha, monto_inicial, monto_final, estado, creado_por
           FROM CajaDiaria
          WHERE estado = 'ABIERTA'
          FOR UPDATE`
      );

      if (cajaRows.length === 0) {
        const error = new Error(
          "No existe una caja diaria abierta para cerrar"
        );
        error.statusCode = 409;
        throw error;
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

      const caja = mapCajaDiariaRow(cajaActualizadaRows[0]);

      return {
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
      };
    });

    return enviarExito(res, resultado, "Caja diaria cerrada correctamente");
  } catch (error) {
    if (error.statusCode) {
      return enviarError(res, error.statusCode, error.message);
    }

    console.error("Error al cerrar caja diaria:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const obtenerCajaActual = async (req, res) => {
  try {
    const [cajaRows] = await promisePool.execute(
      `SELECT id_caja, fecha, fecha_apertura, fecha_cierre,
              monto_inicial, monto_final, estado, creado_por, cerrado_por
         FROM CajaDiaria
        WHERE fecha = CURDATE()
        LIMIT 1`
    );

    if (cajaRows.length === 0) {
      return enviarExito(res, null, "No hay caja registrada para el día de hoy");
    }

    const caja = mapCajaDiariaRow(cajaRows[0]);

    // Si está abierta, agregamos información de totales actuales
    if (caja.estado === "ABIERTA") {
      const [totalesRows] = await promisePool.execute(
        `SELECT
           COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE 0 END), 0) AS total_ingresos,
           COALESCE(SUM(CASE WHEN tipo = 'EGRESO' THEN monto ELSE 0 END), 0) AS total_egresos,
           COALESCE(SUM(CASE WHEN tipo = 'AJUSTE' THEN monto ELSE 0 END), 0) AS total_ajustes,
           COUNT(*) AS cantidad_movimientos
         FROM MovimientoCaja
         WHERE id_caja = ?`,
        [caja.id]
      );

      const totales = totalesRows[0] || {};
      const totalIngresos = roundCurrency(totales.total_ingresos || 0);
      const totalEgresos = roundCurrency(totales.total_egresos || 0);
      const totalAjustes = roundCurrency(totales.total_ajustes || 0);
      const totalDia = roundCurrency(
        totalIngresos - totalEgresos + totalAjustes
      );
      const montoEsperado = roundCurrency((caja.montoInicial || 0) + totalDia);

      return enviarExito(res, {
        ...caja,
        totales: {
          ingresos: totalIngresos,
          egresos: totalEgresos,
          ajustes: totalAjustes,
          totalDia,
          montoEsperado,
          cantidadMovimientos: totales.cantidad_movimientos || 0,
        },
      }, "Caja actual obtenida correctamente");
    }

    return enviarExito(res, caja, "Caja actual obtenida correctamente");
  } catch (error) {
    console.error("Error al obtener caja actual:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const obtenerHistorialCajas = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const estadoFiltro = req.query.estado?.toUpperCase();
    const fechaDesde = req.query.fechaDesde;
    const fechaHasta = req.query.fechaHasta;

    let whereConditions = [];
    let queryParams = [];

    if (estadoFiltro && ["ABIERTA", "CERRADA"].includes(estadoFiltro)) {
      whereConditions.push("estado = ?");
      queryParams.push(estadoFiltro);
    }

    if (fechaDesde) {
      whereConditions.push("fecha >= ?");
      queryParams.push(fechaDesde);
    }

    if (fechaHasta) {
      whereConditions.push("fecha <= ?");
      queryParams.push(fechaHasta);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const [totalRows] = await promisePool.execute(
      `SELECT COUNT(*) as total FROM CajaDiaria ${whereClause}`,
      queryParams
    );

    const total = totalRows[0]?.total || 0;

    const [cajaRows] = await promisePool.execute(
      `SELECT id_caja, fecha, fecha_apertura, fecha_cierre,
              monto_inicial, monto_final, estado, creado_por, cerrado_por
         FROM CajaDiaria
         ${whereClause}
         ORDER BY fecha DESC, id_caja DESC
         LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    const cajas = cajaRows.map(mapCajaDiariaRow);

    return enviarExito(res, cajas, "Historial de cajas obtenido correctamente", 200, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error al obtener historial de cajas:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const obtenerDetalleCaja = async (req, res) => {
  try {
    const idCaja = parseInt(req.params.id);

    if (!Number.isInteger(idCaja) || idCaja <= 0) {
      return enviarError(res, 400, "El ID de la caja no es válido");
    }

    const [cajaRows] = await promisePool.execute(
      `SELECT id_caja, fecha, fecha_apertura, fecha_cierre,
              monto_inicial, monto_final, estado, creado_por, cerrado_por
         FROM CajaDiaria
        WHERE id_caja = ?`,
      [idCaja]
    );

    if (cajaRows.length === 0) {
      return enviarError(res, 404, "Caja no encontrada");
    }

    const caja = mapCajaDiariaRow(cajaRows[0]);

    // Obtener totales de movimientos
    const [totalesRows] = await promisePool.execute(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE 0 END), 0) AS total_ingresos,
         COALESCE(SUM(CASE WHEN tipo = 'EGRESO' THEN monto ELSE 0 END), 0) AS total_egresos,
         COALESCE(SUM(CASE WHEN tipo = 'AJUSTE' THEN monto ELSE 0 END), 0) AS total_ajustes,
         COUNT(*) AS cantidad_movimientos
       FROM MovimientoCaja
       WHERE id_caja = ?`,
      [idCaja]
    );

    const totales = totalesRows[0] || {};
    const totalIngresos = roundCurrency(totales.total_ingresos || 0);
    const totalEgresos = roundCurrency(totales.total_egresos || 0);
    const totalAjustes = roundCurrency(totales.total_ajustes || 0);
    const totalDia = roundCurrency(totalIngresos - totalEgresos + totalAjustes);

    return enviarExito(res, {
      ...caja,
      totales: {
        ingresos: totalIngresos,
        egresos: totalEgresos,
        ajustes: totalAjustes,
        totalDia,
        cantidadMovimientos: totales.cantidad_movimientos || 0,
      },
    }, "Detalle de caja obtenido correctamente");
  } catch (error) {
    console.error("Error al obtener detalle de caja:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const obtenerMovimientosCaja = async (req, res) => {
  try {
    const idCaja = parseInt(req.params.id);

    if (!Number.isInteger(idCaja) || idCaja <= 0) {
      return enviarError(res, 400, "El ID de la caja no es válido");
    }

    // Verificar que la caja existe
    const [cajaRows] = await promisePool.execute(
      `SELECT id_caja FROM CajaDiaria WHERE id_caja = ?`,
      [idCaja]
    );

    if (cajaRows.length === 0) {
      return enviarError(res, 404, "Caja no encontrada");
    }

    const tipoFiltro = req.query.tipo?.toUpperCase();
    let whereConditions = ["id_caja = ?"];
    let queryParams = [idCaja];

    const tiposValidos = [
      "INGRESO",
      "EGRESO",
      "AJUSTE",
      "APERTURA",
      "CIERRE",
      "DEVOLUCION",
    ];
    if (tipoFiltro && tiposValidos.includes(tipoFiltro)) {
      whereConditions.push("tipo = ?");
      queryParams.push(tipoFiltro);
    }

    const whereClause = whereConditions.join(" AND ");

    const [movimientosRows] = await promisePool.execute(
      `SELECT 
         id_mov_caja,
         id_caja,
         id_cliente,
         tipo,
         id_medio_pago,
         monto,
         concepto,
         id_usuario,
         id_movimiento_cuenta,
         fecha
       FROM MovimientoCaja
       WHERE ${whereClause}
       ORDER BY fecha ASC, id_mov_caja ASC`,
      queryParams
    );

    const movimientos = movimientosRows.map((row) => ({
      id: row.id_mov_caja,
      idCaja: row.id_caja,
      idCliente: row.id_cliente,
      tipo: row.tipo,
      idMedioPago: row.id_medio_pago,
      monto: roundCurrency(row.monto || 0),
      concepto: row.concepto,
      idUsuario: row.id_usuario,
      idMovimientoCuenta: row.id_movimiento_cuenta,
      fecha: row.fecha,
    }));

    return enviarExito(res, movimientos, "Movimientos de caja obtenidos correctamente");
  } catch (error) {
    console.error("Error al obtener movimientos de caja:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const obtenerAuditoriaCaja = async (req, res) => {
  try {
    const idCaja = parseInt(req.params.id);

    if (!Number.isInteger(idCaja) || idCaja <= 0) {
      return enviarError(res, 400, "El ID de la caja no es válido");
    }

    // Verificar que la caja existe y está cerrada
    const [cajaRows] = await promisePool.execute(
      `SELECT id_caja, estado FROM CajaDiaria WHERE id_caja = ?`,
      [idCaja]
    );

    if (cajaRows.length === 0) {
      return enviarError(res, 404, "Caja no encontrada");
    }

    if (cajaRows[0].estado !== "CERRADA") {
      return enviarError(
        res,
        409,
        "La caja aún no ha sido cerrada. No hay auditoría disponible"
      );
    }

    const [auditoriaRows] = await promisePool.execute(
      `SELECT 
         id_auditoria,
         id_caja,
         fecha,
         monto_inicial,
         total_dia,
         monto_calculado,
         monto_final,
         diferencia,
         id_usuario,
         observacion
       FROM AuditoriaCaja
       WHERE id_caja = ?
       ORDER BY fecha DESC
       LIMIT 1`,
      [idCaja]
    );

    if (auditoriaRows.length === 0) {
      return enviarError(
        res,
        404,
        "No se encontró registro de auditoría para esta caja"
      );
    }

    const auditoria = auditoriaRows[0];

    return enviarExito(res, {
      id: auditoria.id_auditoria,
      idCaja: auditoria.id_caja,
      fecha: auditoria.fecha,
      montoInicial: roundCurrency(auditoria.monto_inicial || 0),
      totalDia: roundCurrency(auditoria.total_dia || 0),
      montoCalculado: roundCurrency(auditoria.monto_calculado || 0),
      montoFinal: roundCurrency(auditoria.monto_final || 0),
      diferencia: roundCurrency(auditoria.diferencia || 0),
      idUsuario: auditoria.id_usuario,
      observacion: auditoria.observacion,
    }, "Auditoría de caja obtenida correctamente");
  } catch (error) {
    console.error("Error al obtener auditoría de caja:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

module.exports = {
  abrirCajaDiaria,
  cerrarCajaDiaria,
  obtenerCajaActual,
  obtenerHistorialCajas,
  obtenerDetalleCaja,
  obtenerMovimientosCaja,
  obtenerAuditoriaCaja,
};
