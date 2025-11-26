const { promisePool } = require("../config/database");

/**
 * Helper para construir respuestas de error consistentes
 * @param {Object} res - Objeto response de Express
 * @param {number} status - Código de estado HTTP
 * @param {string} mensaje - Mensaje de error
 * @param {Object} datosAdicionales - Datos adicionales opcionales
 */
const enviarError = (res, status, mensaje, datosAdicionales = {}) => {
  res.status(status).json({
    success: false,
    message: mensaje,
    ...datosAdicionales,
  });
};

/**
 * Helper para construir respuestas exitosas consistentes
 * @param {Object} res - Objeto response de Express
 * @param {Object} data - Datos a enviar
 * @param {string} mensaje - Mensaje de éxito
 * @param {number} status - Código de estado HTTP (default: 200)
 */
const enviarExito = (res, data, mensaje, status = 200) => {
  res.status(status).json({
    success: true,
    data,
    message: mensaje,
  });
};

/**
 * Verificar si un registro existe en una tabla
 * @param {string} tabla - Nombre de la tabla
 * @param {string} columnaId - Nombre de la columna ID
 * @param {*} valor - Valor a buscar
 * @returns {Promise<boolean>}
 */
const registroExiste = async (tabla, columnaId, valor) => {
  const [rows] = await promisePool.execute(
    `SELECT 1 FROM ${tabla} WHERE ${columnaId} = ? LIMIT 1`,
    [valor]
  );
  return rows.length > 0;
};

module.exports = {
  enviarError,
  enviarExito,
  registroExiste,
};
