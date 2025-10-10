const { promisePool } = require("../config/database");
const { mapTarjetaRow, mapTarjetasRows } = require("../helpers/tarjetaMapper");
const { v4: uuidv4 } = require("uuid");

/**
 * Obtener todas las tarjetas
 */
const getTarjetas = async (req, res) => {
  try {
    const [rows] = await promisePool.execute(
      `SELECT t.id_tarjeta,
        t.uuid,
        t.id_tipo_suscripcion,
        ts.nombre AS nombre_tipo_suscripcion,
        t.id_nivel_suscripcion,
        ns.nombre AS nombre_nivel_suscripcion,
        ns.limite_credito AS limite_credito_nivel,
        t.saldo_actual
       FROM Tarjeta t
       LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
       LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
       ORDER BY t.id_tarjeta DESC`
    );

    res.json({
      success: true,
      data: mapTarjetasRows(rows),
      message: "Tarjetas obtenidas correctamente",
    });
  } catch (error) {
    console.error("Error al obtener tarjetas:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Obtener tarjeta por ID
 */
const getTarjetaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await promisePool.execute(
      `SELECT t.id_tarjeta,
        t.uuid,
        t.id_tipo_suscripcion,
        ts.nombre AS nombre_tipo_suscripcion,
        t.id_nivel_suscripcion,
        ns.nombre AS nombre_nivel_suscripcion,
        ns.limite_credito AS limite_credito_nivel,
        t.saldo_actual
       FROM Tarjeta t
       LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
       LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
       WHERE t.id_tarjeta = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tarjeta no encontrada",
      });
    }

    res.json({
      success: true,
      data: mapTarjetaRow(rows[0]),
      message: "Tarjeta obtenida correctamente",
    });
  } catch (error) {
    console.error("Error al obtener tarjeta:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Obtener tarjeta por UUID
 */
const getTarjetaPorUUID = async (req, res) => {
  try {
    const { uuid } = req.params;
    const [rows] = await promisePool.execute(
      `SELECT t.id_tarjeta,
        t.uuid,
        t.id_tipo_suscripcion,
        ts.nombre AS nombre_tipo_suscripcion,
        t.id_nivel_suscripcion,
        ns.nombre AS nombre_nivel_suscripcion,
        ns.limite_credito AS limite_credito_nivel,
        t.saldo_actual,
        t.fecha_creacion,
        t.fecha_actualizacion
       FROM Tarjeta t
       LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
       LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
       WHERE t.uuid = ?`,
      [uuid]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tarjeta no encontrada",
      });
    }

    res.json({
      success: true,
      data: mapTarjetaRow(rows[0]),
      message: "Tarjeta obtenida correctamente",
    });
  } catch (error) {
    console.error("Error al obtener tarjeta por UUID:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Crear una nueva tarjeta
 */
const crearTarjeta = async (req, res) => {
  try {
    const {
      uuid: rfidUid, // ahora esperamos el UID leído por hardware
      idTipoSuscripcion,
      idNivelSuscripcion,
      saldoActual,
    } = req.body;

    // Validar que venga un UID físico desde el lector
    if (!rfidUid) {
      return res.status(400).json({
        success: false,
        message:
          "El UID de la tarjeta (uuid) es requerido y debe provenir del lector",
      });
    }
    const uuid = String(rfidUid).toUpperCase().trim();

    if (!idTipoSuscripcion) {
      return res.status(400).json({
        success: false,
        message: "El tipo de suscripción es requerido",
      });
    }

    // Verificar que el UID no exista
    const [uidRows] = await promisePool.execute(
      `SELECT id_tarjeta FROM Tarjeta WHERE uuid = ?`,
      [uuid]
    );
    if (uidRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "La tarjeta física ya se encuentra registrada",
      });
    }

    // Verificar que el tipo de suscripción existe
    const [tipoRows] = await promisePool.execute(
      `SELECT id_tipo FROM TipoSuscripcion WHERE id_tipo = ?`,
      [idTipoSuscripcion]
    );

    if (tipoRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "El tipo de suscripción especificado no existe",
      });
    }

    // Verificar que el nivel de suscripción existe (si se proporciona)
    if (idNivelSuscripcion) {
      const [nivelRows] = await promisePool.execute(
        `SELECT id_nivel FROM NivelSuscripcion WHERE id_nivel = ?`,
        [idNivelSuscripcion]
      );

      if (nivelRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "El nivel de suscripción especificado no existe",
        });
      }
    }

    // Validar saldo actual (debe ser un número válido)
    const saldoFinal =
      saldoActual !== undefined ? parseFloat(saldoActual) : 0.0;

    if (isNaN(saldoFinal) || saldoFinal < 0) {
      return res.status(400).json({
        success: false,
        message: "El saldo actual debe ser un número válido mayor o igual a 0",
      });
    }

    const [result] = await promisePool.execute(
      `INSERT INTO Tarjeta (uuid, id_tipo_suscripcion, id_nivel_suscripcion, saldo_actual)
       VALUES (?, ?, ?, ?)`,
      [uuid, idTipoSuscripcion, idNivelSuscripcion || null, saldoFinal]
    );

    const [nuevaTarjeta] = await promisePool.execute(
      `SELECT t.id_tarjeta,
        t.uuid,
        t.id_tipo_suscripcion,
        ts.nombre AS nombre_tipo_suscripcion,
        t.id_nivel_suscripcion,
        ns.nombre AS nombre_nivel_suscripcion,
        ns.limite_credito AS limite_credito_nivel,
        t.saldo_actual
       FROM Tarjeta t
       LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
       LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
       WHERE t.id_tarjeta = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: mapTarjetaRow(nuevaTarjeta[0]),
      message: "Tarjeta creada exitosamente",
    });
  } catch (error) {
    console.error("Error al crear tarjeta:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Actualizar una tarjeta
 */
const actualizarTarjeta = async (req, res) => {
  try {
    const { id } = req.params;
    const { idTipoSuscripcion, idNivelSuscripcion, saldoActual } = req.body;

    // Verificar que la tarjeta existe
    const [tarjetaExistente] = await promisePool.execute(
      `SELECT id_tarjeta FROM Tarjeta WHERE id_tarjeta = ?`,
      [id]
    );

    if (tarjetaExistente.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tarjeta no encontrada",
      });
    }

    // Construir la query de actualización dinámicamente
    const campos = [];
    const valores = [];

    if (idTipoSuscripcion !== undefined) {
      // Verificar que el tipo existe
      const [tipoRows] = await promisePool.execute(
        `SELECT id_tipo FROM TipoSuscripcion WHERE id_tipo = ?`,
        [idTipoSuscripcion]
      );

      if (tipoRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "El tipo de suscripción especificado no existe",
        });
      }
      campos.push("id_tipo_suscripcion = ?");
      valores.push(idTipoSuscripcion);
    }

    if (idNivelSuscripcion !== undefined) {
      // Verificar que el nivel existe
      const [nivelRows] = await promisePool.execute(
        `SELECT id_nivel FROM NivelSuscripcion WHERE id_nivel = ?`,
        [idNivelSuscripcion]
      );

      if (nivelRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "El nivel de suscripción especificado no existe",
        });
      }
      campos.push("id_nivel_suscripcion = ?");
      valores.push(idNivelSuscripcion);
    }

    if (saldoActual !== undefined) {
      campos.push("saldo_actual = ?");
      valores.push(parseFloat(saldoActual));
    }

    if (campos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No se proporcionaron campos para actualizar",
      });
    }

    valores.push(id);

    await promisePool.execute(
      `UPDATE Tarjeta SET ${campos.join(", ")} WHERE id_tarjeta = ?`,
      valores
    );

    const [tarjetaActualizada] = await promisePool.execute(
      `SELECT t.id_tarjeta,
        t.uuid,
        t.id_tipo_suscripcion,
        ts.nombre AS nombre_tipo_suscripcion,
        t.id_nivel_suscripcion,
        ns.nombre AS nombre_nivel_suscripcion,
        ns.limite_credito AS limite_credito_nivel,
        t.saldo_actual
       FROM Tarjeta t
       LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
       LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
       WHERE t.id_tarjeta = ?`,
      [id]
    );

    res.json({
      success: true,
      data: mapTarjetaRow(tarjetaActualizada[0]),
      message: "Tarjeta actualizada exitosamente",
    });
  } catch (error) {
    console.error("Error al actualizar tarjeta:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Eliminar una tarjeta
 */
const eliminarTarjeta = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la tarjeta existe
    const [tarjetaExistente] = await promisePool.execute(
      `SELECT id_tarjeta FROM Tarjeta WHERE id_tarjeta = ?`,
      [id]
    );

    if (tarjetaExistente.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tarjeta no encontrada",
      });
    }

    await promisePool.execute(`DELETE FROM Tarjeta WHERE id_tarjeta = ?`, [id]);

    res.json({
      success: true,
      message: "Tarjeta eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar tarjeta:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Actualizar saldo de una tarjeta
 */
const actualizarSaldo = async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, operacion } = req.body;

    // Validaciones
    if (!monto || !operacion) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar el monto y la operación (agregar/restar)",
      });
    }

    if (!["agregar", "restar"].includes(operacion)) {
      return res.status(400).json({
        success: false,
        message: "La operación debe ser 'agregar' o 'restar'",
      });
    }

    const montoNumerico = parseFloat(monto);
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      return res.status(400).json({
        success: false,
        message: "El monto debe ser un número positivo",
      });
    }

    // Verificar que la tarjeta existe y obtener saldo actual
    const [tarjetaRows] = await promisePool.execute(
      `SELECT id_tarjeta, saldo_actual FROM Tarjeta WHERE id_tarjeta = ?`,
      [id]
    );

    if (tarjetaRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tarjeta no encontrada",
      });
    }

    const tarjeta = tarjetaRows[0];
    const saldoActual = parseFloat(tarjeta.saldo_actual);

    // Calcular nuevo saldo
    let nuevoSaldo;
    if (operacion === "agregar") {
      nuevoSaldo = saldoActual + montoNumerico;
    } else {
      nuevoSaldo = saldoActual - montoNumerico;
      if (nuevoSaldo < 0) {
        return res.status(400).json({
          success: false,
          message: "Saldo insuficiente para realizar la operación",
        });
      }
    }

    // Actualizar saldo
    await promisePool.execute(
      `UPDATE Tarjeta SET saldo_actual = ? WHERE id_tarjeta = ?`,
      [nuevoSaldo, id]
    );

    const [tarjetaActualizada] = await promisePool.execute(
      `SELECT t.id_tarjeta,
        t.uuid,
        t.id_tipo_suscripcion,
        ts.nombre AS nombre_tipo_suscripcion,
        t.id_nivel_suscripcion,
        ns.nombre AS nombre_nivel_suscripcion,
        t.saldo_actual
       FROM Tarjeta t
       LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
       LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
       WHERE t.id_tarjeta = ?`,
      [id]
    );

    res.json({
      success: true,
      data: mapTarjetaRow(tarjetaActualizada[0]),
      message: `Saldo ${
        operacion === "agregar" ? "agregado" : "restado"
      } exitosamente`,
    });
  } catch (error) {
    console.error("Error al actualizar saldo:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Regenerar UUID de una tarjeta (función de utilidad)
 * Solo para casos especiales de mantenimiento
 */
const regenerarUUID = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la tarjeta existe
    const [tarjetaRows] = await promisePool.execute(
      `SELECT id_tarjeta FROM Tarjeta WHERE id_tarjeta = ?`,
      [id]
    );

    if (tarjetaRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tarjeta no encontrada",
      });
    }

    // Generar nuevo UUID
    const nuevoUuid = uuidv4();

    // Actualizar la tarjeta con el nuevo UUID
    await promisePool.execute(
      `UPDATE Tarjeta SET uuid = ? WHERE id_tarjeta = ?`,
      [nuevoUuid, id]
    );

    // Obtener la tarjeta actualizada
    const [tarjetaActualizada] = await promisePool.execute(
      `SELECT t.id_tarjeta,
        t.uuid,
        t.id_tipo_suscripcion,
        ts.nombre AS nombre_tipo_suscripcion,
        t.id_nivel_suscripcion,
        ns.nombre AS nombre_nivel_suscripcion,
        ns.limite_credito AS limite_credito_nivel,
        t.saldo_actual
       FROM Tarjeta t
       LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
       LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
       WHERE t.id_tarjeta = ?`,
      [id]
    );

    res.json({
      success: true,
      data: mapTarjetaRow(tarjetaActualizada[0]),
      message: "UUID regenerado exitosamente",
    });
  } catch (error) {
    console.error("Error al regenerar UUID:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

module.exports = {
  getTarjetas,
  getTarjetaPorId,
  getTarjetaPorUUID,
  crearTarjeta,
  actualizarTarjeta,
  eliminarTarjeta,
  actualizarSaldo,
  regenerarUUID,
};
