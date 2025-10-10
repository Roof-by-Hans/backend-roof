const { rfidService } = require("../hardware/rfidService");
const { promisePool } = require("../config/database");

// POST /api/rfid/scan
const scan = async (req, res) => {
  console.log("[rfidController.scan] INICIO - Request body:", req.body);
  try {
    const timeout = Number(req.body?.timeoutMs || 10000);
    console.log("[rfidController.scan] Timeout configurado:", timeout);
    console.log("[rfidController.scan] Estado del servicio RFID:", {
      isReady: rfidService.isReady(),
      connecting: rfidService.connecting,
    });

    console.log("[rfidController.scan] Llamando a rfidService.readOnce...");
    const uid = await rfidService.readOnce(timeout);
    console.log("[rfidController.scan] UID obtenido:", uid);

    const response = {
      success: true,
      data: { uid },
      message: "Tarjeta detectada",
    };
    console.log("[rfidController.scan] Enviando respuesta:", response);
    return res.json(response);
  } catch (err) {
    console.error("[rfidController.scan] ERROR:", err.message);
    const errorResponse = { success: false, message: err.message };
    console.log("[rfidController.scan] Enviando error:", errorResponse);
    return res.status(504).json(errorResponse);
  }
};

// POST /api/rfid/verificar
const verificar = async (req, res) => {
  try {
    const { rfidUid } = req.body;
    if (!rfidUid) {
      return res
        .status(400)
        .json({ success: false, message: "rfidUid es requerido" });
    }
    const uid = String(rfidUid).toUpperCase().trim();
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
        WHERE t.uuid = ?
        LIMIT 1`,
      [uid]
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Tarjeta no encontrada" });
    }
    return res.json({
      success: true,
      data: rows[0],
      message: "Tarjeta encontrada",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Error interno", error: err.message });
  }
};

module.exports = { scan, verificar };
