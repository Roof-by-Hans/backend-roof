const { promisePool } = require("../config/database");

/**
 * Ejecuta una función dentro de una transacción de base de datos.
 * Maneja automáticamente beginTransaction, commit, rollback y release.
 *
 * @param {Function} callback - Función asíncrona que recibe la conexión.
 * @returns {Promise<any>} - El resultado de la función callback.
 * @throws {Error} - Re-lanza cualquier error ocurrido durante la ejecución.
 */
const withTransaction = async (callback) => {
  let connection;
  try {
    connection = await promisePool.getConnection();
    await connection.beginTransaction();

    const result = await callback(connection);

    await connection.commit();
    return result;
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Error al revertir transacción:", rollbackError);
      }
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  withTransaction,
};
