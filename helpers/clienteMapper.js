/**
 * Mapea una fila de base de datos de Cliente a un objeto de respuesta limpio
 * @param {Object} row - Fila de la base de datos
 * @returns {Object} - Objeto Cliente mapeado
 */
const mapClienteRow = (row) => {
  if (!row) return null;

  return {
    id: row.id_cliente,
    nombre: row.nombre,
    apellido: row.apellido,
    telefono: row.telefono || null,
    email: row.email || null,
    idTarjeta: row.id_tarjeta || null,
    fotoPerfil: row.foto_perfil || null,
    preferencias: row.preferencias || null,
    // Si hay información de tarjeta relacionada
    ...(row.tarjeta_uuid && {
      tarjeta: {
        id: row.id_tarjeta,
        uuid: row.tarjeta_uuid,
      },
    }),
  };
};

/**
 * Mapea múltiples filas de base de datos de Cliente
 * @param {Array} rows - Filas de la base de datos
 * @returns {Array} - Array de objetos Cliente mapeados
 */
const mapClientesRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map(mapClienteRow);
};

module.exports = {
  mapClienteRow,
  mapClientesRows,
};
