const { promisePool } = require("../config/database");
const { mapTarjetaRow, mapTarjetasRows } = require("../helpers/tarjetaMapper");

/**
 * Obtener todas las tarjetas
 */
const getTarjetas = async (req, res) => {
  try {
    const [rows] = await promisePool.execute(
      `SELECT t.id_tarjeta,
        t.numero,
        t.id_tipo_suscripcion,
        ts.nombre AS nombre_tipo_suscripcion,
        t.id_nivel_suscripcion,
        ns.nombre AS nombre_nivel_suscripcion,
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
        t.numero,
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
 * Crear una nueva tarjeta
 */
const crearTarjeta = async (req, res) => {
  try {
    const {
      numero,
      idTipoSuscripcion,
      idNivelSuscripcion,
      saldoActual,
    } = req.body;

    // Validaciones
    if (!numero || !idTipoSuscripcion || !idNivelSuscripcion) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos obligatorios deben ser proporcionados (numero, idTipoSuscripcion, idNivelSuscripcion)",
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

    // Verificar que el nivel de suscripción existe
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

    // Verificar que no exista una tarjeta con el mismo número
    const [existente] = await promisePool.execute(
      `SELECT id_tarjeta FROM Tarjeta WHERE numero = ?`,
      [numero]
    );

    if (existente.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Ya existe una tarjeta con ese número",
      });
    }

    const saldoFinal = saldoActual !== undefined ? parseFloat(saldoActual) : 0;

    const [result] = await promisePool.execute(
      `INSERT INTO Tarjeta (numero, id_tipo_suscripcion, id_nivel_suscripcion, saldo_actual)
       VALUES (?, ?, ?, ?)`,
      [numero, idTipoSuscripcion, idNivelSuscripcion, saldoFinal]
    );

    const [nuevaTarjeta] = await promisePool.execute(
      `SELECT t.id_tarjeta,
        t.numero,
        t.id_tipo_suscripcion,
        ts.nombre AS nombre_tipo_suscripcion,
        t.id_nivel_suscripcion,
        ns.nombre AS nombre_nivel_suscripcion,
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
    const { numero, idTipoSuscripcion, idNivelSuscripcion, saldoActual } = req.body;

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

    if (numero !== undefined) {
      // Verificar que no exista otra tarjeta con el mismo número
      const [existente] = await promisePool.execute(
        `SELECT id_tarjeta FROM Tarjeta WHERE numero = ? AND id_tarjeta != ?`,
        [numero, id]
      );

      if (existente.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Ya existe otra tarjeta con ese número",
        });
      }
      campos.push("numero = ?");
      valores.push(numero);
    }

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
        t.numero,
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

    await promisePool.execute(
      `DELETE FROM Tarjeta WHERE id_tarjeta = ?`,
      [id]
    );

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
        t.numero,
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
      message: `Saldo ${operacion === "agregar" ? "agregado" : "restado"} exitosamente`,
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
 * Validar tarjeta NFC (para lector físico - SIN autenticación)
 * Este endpoint es usado por el lector NFC para validar acceso
 */
const validarNFC = async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid || uid.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "El UID de la tarjeta NFC es requerido",
      });
    }

    // Buscar tarjeta por UID (numero)
    const [rows] = await promisePool.execute(
      `SELECT t.id_tarjeta,
        t.numero,
        t.id_tipo_suscripcion,
        ts.nombre AS nombre_tipo_suscripcion,
        t.id_nivel_suscripcion,
        ns.nombre AS nombre_nivel_suscripcion,
        t.saldo_actual
       FROM Tarjeta t
       LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
       LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
       WHERE t.numero = ?`,
      [uid]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tarjeta NFC no registrada",
      });
    }

    const tarjeta = rows[0];

    // Verificar saldo
    const saldo = parseFloat(tarjeta.saldo_actual);
    if (saldo <= 0) {
      return res.status(403).json({
        success: false,
        message: "Saldo insuficiente",
        saldo: saldo,
      });
    }

    res.json({
      success: true,
      data: mapTarjetaRow(tarjeta),
      message: "Tarjeta válida - Acceso permitido",
    });
  } catch (error) {
    console.error("Error al validar NFC:", error);
    res.status(500).json({
      success: false,
      message: "Error al validar la tarjeta NFC",
      error: error.message,
    });
  }
};

/**
 * Descontar saldo de tarjeta NFC (para lector físico - SIN autenticación)
 * Se usa cuando el usuario pasa la tarjeta en el lector
 */
const descontarSaldo = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { uid } = req.params;
    const { monto, concepto } = req.body;

    if (!uid || uid.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "El UID de la tarjeta NFC es requerido",
      });
    }

    if (!monto || monto <= 0) {
      return res.status(400).json({
        success: false,
        message: "El monto debe ser mayor a 0",
      });
    }

    await connection.beginTransaction();

    // Buscar tarjeta
    const [rows] = await connection.execute(
      `SELECT t.id_tarjeta,
        t.numero,
        t.id_tipo_suscripcion,
        ts.nombre AS nombre_tipo_suscripcion,
        t.id_nivel_suscripcion,
        ns.nombre AS nombre_nivel_suscripcion,
        t.saldo_actual
       FROM Tarjeta t
       LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
       LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
       WHERE t.numero = ?`,
      [uid]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Tarjeta NFC no encontrada",
      });
    }

    const tarjeta = rows[0];
    const saldoActual = parseFloat(tarjeta.saldo_actual);

    // Verificar saldo suficiente
    if (saldoActual < monto) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Saldo insuficiente",
        saldoActual: saldoActual,
        montoRequerido: monto,
      });
    }

    const nuevoSaldo = saldoActual - monto;

    // Actualizar saldo
    await connection.execute(
      `UPDATE Tarjeta SET saldo_actual = ? WHERE id_tarjeta = ?`,
      [nuevoSaldo, tarjeta.id_tarjeta]
    );

    await connection.commit();

    // Obtener tarjeta actualizada
    const [tarjetaActualizada] = await connection.execute(
      `SELECT t.id_tarjeta,
        t.numero,
        t.id_tipo_suscripcion,
        ts.nombre AS nombre_tipo_suscripcion,
        t.id_nivel_suscripcion,
        ns.nombre AS nombre_nivel_suscripcion,
        t.saldo_actual
       FROM Tarjeta t
       LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
       LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
       WHERE t.id_tarjeta = ?`,
      [tarjeta.id_tarjeta]
    );

    res.json({
      success: true,
      data: mapTarjetaRow(tarjetaActualizada[0]),
      message: "Saldo descontado exitosamente",
      movimiento: {
        concepto: concepto || "Uso de tarjeta NFC",
        montoDescontado: monto,
        saldoAnterior: saldoActual,
        saldoNuevo: nuevoSaldo,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error al descontar saldo:", error);
    res.status(500).json({
      success: false,
      message: "Error al descontar saldo",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Recargar saldo de tarjeta NFC (para terminal de recarga - SIN autenticación)
 * Este endpoint es usado por el punto de recarga para agregar saldo
 */
const recargarSaldo = async (req, res) => {
  let connection;

  try {
    const { uid } = req.params;
    const { monto, metodoPago } = req.body;

    if (!uid || uid.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "UID de tarjeta NFC requerido",
      });
    }

    if (!monto || monto <= 0) {
      return res.status(400).json({
        success: false,
        message: "El monto debe ser mayor a 0",
      });
    }

    connection = await promisePool.getConnection();
    await connection.beginTransaction();

    // Buscar tarjeta
    const [rows] = await connection.execute(
      `SELECT t.id_tarjeta,
        t.numero,
        t.id_tipo_suscripcion,
        ts.nombre AS nombre_tipo_suscripcion,
        t.id_nivel_suscripcion,
        ns.nombre AS nombre_nivel_suscripcion,
        t.saldo_actual
       FROM Tarjeta t
       LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
       LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
       WHERE t.numero = ?`,
      [uid]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Tarjeta NFC no encontrada",
      });
    }

    const tarjeta = rows[0];
    const saldoActual = parseFloat(tarjeta.saldo_actual);
    const nuevoSaldo = saldoActual + parseFloat(monto);

    // Actualizar saldo
    await connection.execute(
      `UPDATE Tarjeta SET saldo_actual = ? WHERE id_tarjeta = ?`,
      [nuevoSaldo, tarjeta.id_tarjeta]
    );

    // Opcional: Registrar movimiento si tienes tabla MovimientoTarjeta
    // await connection.execute(
    //   `INSERT INTO MovimientoTarjeta (id_tarjeta, tipo_movimiento, monto, saldo_anterior, saldo_nuevo, metodo_pago, fecha)
    //    VALUES (?, 'RECARGA', ?, ?, ?, ?, NOW())`,
    //   [tarjeta.id_tarjeta, monto, saldoActual, nuevoSaldo, metodoPago || 'EFECTIVO']
    // );

    await connection.commit();

    // Obtener tarjeta actualizada
    const [tarjetaActualizada] = await connection.execute(
      `SELECT t.id_tarjeta,
        t.numero,
        t.id_tipo_suscripcion,
        ts.nombre AS nombre_tipo_suscripcion,
        t.id_nivel_suscripcion,
        ns.nombre AS nombre_nivel_suscripcion,
        t.saldo_actual
       FROM Tarjeta t
       LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
       LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
       WHERE t.id_tarjeta = ?`,
      [tarjeta.id_tarjeta]
    );

    res.json({
      success: true,
      data: mapTarjetaRow(tarjetaActualizada[0]),
      message: "Saldo recargado exitosamente",
      movimiento: {
        concepto: "Recarga de saldo",
        montoRecargado: parseFloat(monto),
        metodoPago: metodoPago || "EFECTIVO",
        saldoAnterior: saldoActual,
        saldoNuevo: nuevoSaldo,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error al recargar saldo:", error);
    res.status(500).json({
      success: false,
      message: "Error al recargar saldo",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Buscar tarjeta por UID de NFC (requiere autenticación)
 */
const buscarPorUID = async (req, res) => {
  try {
    const { uid } = req.params;

    const [rows] = await promisePool.execute(
      `SELECT t.id_tarjeta,
        t.numero,
        t.id_tipo_suscripcion,
        ts.nombre AS nombre_tipo_suscripcion,
        t.id_nivel_suscripcion,
        ns.nombre AS nombre_nivel_suscripcion,
        t.saldo_actual
       FROM Tarjeta t
       LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
       LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
       WHERE t.numero = ?`,
      [uid]
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
      message: "Tarjeta encontrada",
    });
  } catch (error) {
    console.error("Error al buscar por UID:", error);
    res.status(500).json({
      success: false,
      message: "Error al buscar la tarjeta",
      error: error.message,
    });
  }
};

module.exports = {
  getTarjetas,
  getTarjetaPorId,
  crearTarjeta,
  actualizarTarjeta,
  eliminarTarjeta,
  actualizarSaldo,
  validarNFC,
  descontarSaldo,
  recargarSaldo,
  buscarPorUID,
};
