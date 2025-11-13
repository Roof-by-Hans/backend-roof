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
 * Crear una nueva tarjeta
 */
const crearTarjeta = async (req, res) => {
  try {
    const { idTipoSuscripcion, idNivelSuscripcion, saldoActual } = req.body;

    // Generar UUID v4 automáticamente para la tarjeta física
    // Este UUID será único e irrepetible para cada tarjeta
    const uuid = uuidv4();

    if (!idTipoSuscripcion) {
      return res.status(400).json({
        success: false,
        message: "El tipo de suscripción es requerido",
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

/**
 * Asociar tarjeta RFID a un cliente
 * POST /api/tarjetas/asociar
 */
const asociarTarjetaCliente = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      idCliente,
      rfidUid,
      idTipoSuscripcion,
      idNivelSuscripcion,
      saldoInicial,
      forzarDesvinculacion,
    } = req.body;

    // 1. Validaciones de entrada
    if (!idCliente || !rfidUid || !idTipoSuscripcion) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Los campos idCliente, rfidUid e idTipoSuscripcion son obligatorios",
      });
    }

    // 2. Verificar que el cliente existe
    const [clienteRows] = await connection.execute(
      `SELECT id_cliente, id_tarjeta, nombre, apellido FROM Cliente WHERE id_cliente = ?`,
      [idCliente]
    );

    if (clienteRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    const cliente = clienteRows[0];

    // 3. PRIMERO: Buscar si la tarjeta escaneada ya existe y a quién pertenece
    const uidNormalizado = String(rfidUid).toUpperCase().trim();
    const [tarjetaEscaneadaRows] = await connection.execute(
      `SELECT t.id_tarjeta, t.uuid, c.id_cliente, c.nombre, c.apellido,
              ts.nombre AS tipo_suscripcion, ns.nombre AS nivel_suscripcion
       FROM Tarjeta t
       LEFT JOIN Cliente c ON c.id_tarjeta = t.id_tarjeta
       LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
       LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
       WHERE t.uuid = ?`,
      [uidNormalizado]
    );

    // 4. SEGUNDO: Obtener info de la tarjeta actual del cliente (si tiene)
    let tarjetaActualCliente = null;
    if (cliente.id_tarjeta !== null) {
      const [tarjetaActualRows] = await connection.execute(
        `SELECT t.id_tarjeta, t.uuid, ts.nombre AS tipo_suscripcion, ns.nombre AS nivel_suscripcion
         FROM Tarjeta t
         LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
         LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
         WHERE t.id_tarjeta = ?`,
        [cliente.id_tarjeta]
      );
      if (tarjetaActualRows.length > 0) {
        tarjetaActualCliente = tarjetaActualRows[0];
      }
    }

    // 5. Analizar escenarios de conflicto
    const tarjetaEscaneada =
      tarjetaEscaneadaRows.length > 0 ? tarjetaEscaneadaRows[0] : null;
    const esLaMismaTarjeta =
      tarjetaActualCliente &&
      tarjetaEscaneada &&
      tarjetaActualCliente.uuid === tarjetaEscaneada.uuid;

    console.log(`[ASOCIAR] Análisis de conflictos:`, {
      clienteNuevo: { id: cliente.id_cliente, nombre: cliente.nombre },
      tarjetaEscaneada: tarjetaEscaneada
        ? { uuid: tarjetaEscaneada.uuid, propietario: tarjetaEscaneada.nombre }
        : "nueva",
      tarjetaActualCliente: tarjetaActualCliente
        ? tarjetaActualCliente.uuid
        : "ninguna",
      esLaMismaTarjeta,
    });

    // 6. Manejar conflictos si no se fuerza la desvinculación
    if (!forzarDesvinculacion) {
      // Caso 1: La tarjeta escaneada pertenece a otro cliente DIFERENTE
      if (
        tarjetaEscaneada &&
        tarjetaEscaneada.id_cliente !== null &&
        tarjetaEscaneada.id_cliente !== parseInt(idCliente)
      ) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: `Esta tarjeta ya está asociada al cliente ${tarjetaEscaneada.nombre} ${tarjetaEscaneada.apellido}`,
          data: {
            clienteActual: {
              id: tarjetaEscaneada.id_cliente,
              nombre: tarjetaEscaneada.nombre,
              apellido: tarjetaEscaneada.apellido,
            },
            tarjetaActual: {
              uuid: tarjetaEscaneada.uuid,
              tipo: tarjetaEscaneada.tipo_suscripcion,
              nivel: tarjetaEscaneada.nivel_suscripcion,
            },
            esMismoCliente: false,
          },
        });
      }

      // Caso 2: Es la misma tarjeta del mismo cliente (actualización de tipo)
      if (esLaMismaTarjeta) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: `Esta tarjeta ya pertenece a este cliente. Se resetearán todos los datos de la tarjeta.`,
          data: {
            clienteActual: {
              id: cliente.id_cliente,
              nombre: cliente.nombre,
              apellido: cliente.apellido,
            },
            tarjetaActual: {
              uuid: tarjetaActualCliente.uuid,
              tipo: tarjetaActualCliente.tipo_suscripcion,
              nivel: tarjetaActualCliente.nivel_suscripcion,
            },
            esMismoCliente: true,
          },
        });
      }

      // Caso 3: El cliente ya tiene una tarjeta DIFERENTE
      if (tarjetaActualCliente && !esLaMismaTarjeta) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: `El cliente ${cliente.nombre} ${cliente.apellido} ya tiene una tarjeta asociada`,
          data: {
            clienteActual: {
              id: cliente.id_cliente,
              nombre: cliente.nombre,
              apellido: cliente.apellido,
            },
            tarjetaActual: {
              uuid: tarjetaActualCliente.uuid,
              tipo: tarjetaActualCliente.tipo_suscripcion,
              nivel: tarjetaActualCliente.nivel_suscripcion,
            },
            clienteNuevoYaTieneTarjeta: true,
          },
        });
      }
    }

    // 7. Si llegamos aquí, proceder con las desvinculaciones necesarias
    // Desvincular tarjeta escaneada de su dueño anterior (si tiene)
    if (
      tarjetaEscaneada &&
      tarjetaEscaneada.id_cliente !== null &&
      tarjetaEscaneada.id_cliente !== parseInt(idCliente)
    ) {
      console.log(
        `[ASOCIAR] Desvinculando tarjeta ${tarjetaEscaneada.uuid} del cliente ${tarjetaEscaneada.id_cliente}`
      );
      await connection.execute(
        `UPDATE Cliente SET id_tarjeta = NULL WHERE id_cliente = ?`,
        [tarjetaEscaneada.id_cliente]
      );
    }

    // Desvincular tarjeta actual del cliente nuevo (si tiene una diferente)
    if (tarjetaActualCliente && !esLaMismaTarjeta) {
      console.log(
        `[ASOCIAR] Desvinculando tarjeta anterior ${tarjetaActualCliente.uuid} del cliente ${idCliente}`
      );
      await connection.execute(
        `UPDATE Cliente SET id_tarjeta = NULL WHERE id_cliente = ?`,
        [idCliente]
      );
    }

    // Variables para tracking
    let tarjetaAnteriorCliente =
      tarjetaActualCliente && !esLaMismaTarjeta ? cliente.id_tarjeta : null;

    // 4. Verificar que el tipo de suscripción existe
    const [tipoRows] = await connection.execute(
      `SELECT id_tipo, nombre FROM TipoSuscripcion WHERE id_tipo = ?`,
      [idTipoSuscripcion]
    );

    if (tipoRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Tipo de suscripción no encontrado",
      });
    }

    const tipoSuscripcion = tipoRows[0];

    // 5. Validar nivel de suscripción según el tipo
    if (tipoSuscripcion.nombre === "CREDITO") {
      // Para CREDITO, el nivel es obligatorio
      if (!idNivelSuscripcion) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message:
            "El nivel de suscripción es obligatorio para tarjetas de CREDITO",
        });
      }

      const [nivelRows] = await connection.execute(
        `SELECT id_nivel FROM NivelSuscripcion WHERE id_nivel = ?`,
        [idNivelSuscripcion]
      );

      if (nivelRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Nivel de suscripción no encontrado",
        });
      }
    }

    // 8. Determinar si la tarjeta existe y su ID
    let idTarjeta;
    let tarjetaYaExistia = tarjetaEscaneada !== null;
    let tarjetaEstabaAsociada =
      tarjetaEscaneada && tarjetaEscaneada.id_cliente !== null;
    let idClienteAnteriorTarjeta = tarjetaEscaneada
      ? tarjetaEscaneada.id_cliente
      : null;

    if (tarjetaYaExistia) {
      // La tarjeta existe → Actualizar tipo, nivel y saldo
      idTarjeta = tarjetaEscaneada.id_tarjeta;

      const saldoFinal =
        tipoSuscripcion.nombre === "PREPAGA" && saldoInicial !== undefined
          ? parseFloat(saldoInicial)
          : 0.0;

      console.log(`[ASOCIAR] Actualizando tarjeta existente ${idTarjeta}:`, {
        tipo: tipoSuscripcion.nombre,
        idTipoSuscripcion,
        idNivelSuscripcion:
          tipoSuscripcion.nombre === "CREDITO" ? idNivelSuscripcion : null,
        saldoFinal,
      });

      await connection.execute(
        `UPDATE Tarjeta 
         SET id_tipo_suscripcion = ?, 
             id_nivel_suscripcion = ?,
             saldo_actual = ?
         WHERE id_tarjeta = ?`,
        [
          idTipoSuscripcion,
          tipoSuscripcion.nombre === "CREDITO" ? idNivelSuscripcion : null,
          saldoFinal,
          idTarjeta,
        ]
      );
    } else {
      // La tarjeta NO existe → Crear nueva
      const saldoFinal =
        tipoSuscripcion.nombre === "PREPAGA" && saldoInicial !== undefined
          ? parseFloat(saldoInicial)
          : 0.0;

      const [insertResult] = await connection.execute(
        `INSERT INTO Tarjeta (uuid, id_tipo_suscripcion, id_nivel_suscripcion, saldo_actual)
         VALUES (?, ?, ?, ?)`,
        [
          uidNormalizado,
          idTipoSuscripcion,
          tipoSuscripcion.nombre === "CREDITO" ? idNivelSuscripcion : null,
          saldoFinal,
        ]
      );
      idTarjeta = insertResult.insertId;
    }

    // 7. Asociar la tarjeta al cliente
    // Siempre vincular, excepto si es la misma tarjeta Y no se desvinculó antes
    const necesitaVincular =
      !esLaMismaTarjeta || tarjetaAnteriorCliente !== null;

    console.log(`[ASOCIAR] Paso 7 - Vincular tarjeta:`, {
      idTarjeta,
      idCliente,
      esLaMismaTarjeta,
      tarjetaAnteriorCliente,
      necesitaVincular,
    });

    if (necesitaVincular) {
      console.log(
        `[ASOCIAR] ✅ Vinculando tarjeta ${idTarjeta} al cliente ${idCliente}`
      );
      await connection.execute(
        `UPDATE Cliente SET id_tarjeta = ? WHERE id_cliente = ?`,
        [idTarjeta, idCliente]
      );
    } else {
      console.log(
        `[ASOCIAR] Tarjeta ${idTarjeta} ya estaba vinculada al cliente ${idCliente}, solo se actualizó`
      );
    }

    // 8. Obtener datos completos de la tarjeta para retornar
    const [tarjetaFinalRows] = await connection.execute(
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
      [idTarjeta]
    );

    await connection.commit();

    // Construir mensaje descriptivo
    let mensaje = "";
    if (esLaMismaTarjeta) {
      mensaje = "Tipo de suscripción de la tarjeta actualizado exitosamente.";
    } else {
      if (tarjetaAnteriorCliente !== null) {
        mensaje = "Tarjeta anterior del cliente desvinculada. ";
      }
      if (tarjetaYaExistia) {
        mensaje += "Tarjeta escaneada actualizada y asociada al cliente.";
      } else {
        mensaje += "Nueva tarjeta creada y asociada al cliente.";
      }
    }

    res.status(200).json({
      success: true,
      data: {
        tarjeta: mapTarjetaRow(tarjetaFinalRows[0]),
        cliente: {
          id: cliente.id_cliente,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
        },
        operaciones: {
          clienteTeniaTrajetaAnterior: tarjetaAnteriorCliente !== null,
          tarjetaEscaneadaYaExistia: tarjetaYaExistia,
          seDesvinculoTarjetaAnteriorCliente: tarjetaAnteriorCliente !== null,
          seDesvinculoTarjetaEscaneada: tarjetaEstabaAsociada,
          idClienteAnteriorTarjeta,
          esLaMismaTarjeta, // Indica si el cliente está actualizando su propia tarjeta
        },
      },
      message: mensaje,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al asociar tarjeta:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Verificar si un UID ya existe
 * POST /api/tarjetas/verificar-uid
 */
const verificarUidExistente = async (req, res) => {
  try {
    const { rfidUid } = req.body;

    if (!rfidUid) {
      return res.status(400).json({
        success: false,
        message: "El campo rfidUid es obligatorio",
      });
    }

    const uidNormalizado = String(rfidUid).toUpperCase().trim();

    const [tarjetaRows] = await promisePool.execute(
      `SELECT t.id_tarjeta,
              t.uuid,
              t.id_tipo_suscripcion,
              ts.nombre AS nombre_tipo_suscripcion,
              t.id_nivel_suscripcion,
              ns.nombre AS nombre_nivel_suscripcion,
              c.id_cliente,
              c.nombre AS cliente_nombre,
              c.apellido AS cliente_apellido
       FROM Tarjeta t
       LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
       LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
       LEFT JOIN Cliente c ON c.id_tarjeta = t.id_tarjeta
       WHERE t.uuid = ?`,
      [uidNormalizado]
    );

    if (tarjetaRows.length === 0) {
      return res.json({
        success: true,
        existe: false,
        message: "UID disponible para nueva tarjeta",
      });
    }

    const tarjeta = tarjetaRows[0];

    res.json({
      success: true,
      existe: true,
      data: {
        idTarjeta: tarjeta.id_tarjeta,
        uuid: tarjeta.uuid,
        tipoSuscripcion: tarjeta.nombre_tipo_suscripcion,
        nivelSuscripcion: tarjeta.nombre_nivel_suscripcion,
        asociadaACliente: tarjeta.id_cliente !== null,
        cliente: tarjeta.id_cliente
          ? {
              id: tarjeta.id_cliente,
              nombre: tarjeta.cliente_nombre,
              apellido: tarjeta.cliente_apellido,
            }
          : null,
      },
      message: "Tarjeta con este UID ya existe en el sistema",
    });
  } catch (error) {
    console.error("Error al verificar UID:", error);
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
  crearTarjeta,
  actualizarTarjeta,
  eliminarTarjeta,
  actualizarSaldo,
  regenerarUUID,
  asociarTarjetaCliente,
  verificarUidExistente,
};
