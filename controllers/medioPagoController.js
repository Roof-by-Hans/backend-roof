const { promisePool } = require("../config/database");
const { enviarExito, enviarError } = require("../helpers/responseHelpers");

const obtenerMediosPago = async (req, res) => {
  try {
    let [rows] = await promisePool.execute(
      "SELECT id_medio_pago, nombre FROM MedioPago ORDER BY nombre ASC"
    );

    // Si no hay medios de pago, insertar los por defecto
    if (rows.length === 0) {
      const defaultMedios = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"];
      
      for (const nombre of defaultMedios) {
        await promisePool.execute(
          "INSERT IGNORE INTO MedioPago (nombre) VALUES (?)",
          [nombre]
        );
      }

      // Volver a consultar
      [rows] = await promisePool.execute(
        "SELECT id_medio_pago, nombre FROM MedioPago ORDER BY nombre ASC"
      );
    }

    return enviarExito(res, rows, "Medios de pago obtenidos correctamente");
  } catch (error) {
    console.error("Error al obtener medios de pago:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

module.exports = {
  obtenerMediosPago,
};
