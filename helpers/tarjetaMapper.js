/**
 * Mapea una fila de tarjeta de la base de datos a un objeto limpio
 * @param {Object} row - Fila de la base de datos
 * @returns {Object} Objeto tarjeta mapeado
 */
const mapTarjetaRow = (row) => {
  if (!row) return null;

  return {
    id: row.id_tarjeta,
    numero: row.numero,
    idTipoSuscripcion: row.id_tipo_suscripcion,
    nombreTipoSuscripcion: row.nombre_tipo_suscripcion || null,
    idNivelSuscripcion: row.id_nivel_suscripcion,
    nombreNivelSuscripcion: row.nombre_nivel_suscripcion || null,
    saldoActual: parseFloat(row.saldo_actual) || 0,
  };
};

/**
 * Mapea múltiples filas de tarjetas
 * @param {Array} rows - Array de filas de la base de datos
 * @returns {Array} Array de objetos tarjeta mapeados
 */
const mapTarjetasRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map(mapTarjetaRow);
};

module.exports = {
  mapTarjetaRow,
  mapTarjetasRows,
};
