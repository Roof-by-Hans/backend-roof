/**
 * Mapper para TipoSuscripcion
 * Transforma datos entre la base de datos y objetos JavaScript
 */

/**
 * Mapea una fila de TipoSuscripcion de la BD a objeto JS
 */
const mapTipoSuscripcionRow = (row) => {
  if (!row) return null;

  return {
    id: row.id_tipo,
    nombre: row.nombre,
  };
};

/**
 * Mapea múltiples filas de TipoSuscripcion
 */
const mapTipoSuscripcionRows = (rows) => {
  if (!rows || rows.length === 0) return [];
  return rows.map(mapTipoSuscripcionRow);
};

/**
 * Mapea objeto JS a formato de BD para inserción
 */
const mapTipoSuscripcionToDB = (tipoSuscripcion) => {
  return {
    nombre: tipoSuscripcion.nombre,
  };
};

module.exports = {
  mapTipoSuscripcionRow,
  mapTipoSuscripcionRows,
  mapTipoSuscripcionToDB,
};
