/**
 * Mapper para NivelSuscripcion
 * Transforma datos entre la base de datos y objetos JavaScript
 */

/**
 * Mapea una fila de NivelSuscripcion de la BD a objeto JS
 */
const mapNivelSuscripcionRow = (row) => {
  if (!row) return null;

  return {
    id: row.id_nivel,
    nombre: row.nombre,
    limite_credito: parseFloat(row.limite_credito),
  };
};

/**
 * Mapea múltiples filas de NivelSuscripcion
 */
const mapNivelSuscripcionRows = (rows) => {
  if (!rows || rows.length === 0) return [];
  return rows.map(mapNivelSuscripcionRow);
};

/**
 * Mapea objeto JS a formato de BD para inserción
 */
const mapNivelSuscripcionToDB = (nivelSuscripcion) => {
  return {
    nombre: nivelSuscripcion.nombre,
    limite_credito: nivelSuscripcion.limite_credito,
  };
};

module.exports = {
  mapNivelSuscripcionRow,
  mapNivelSuscripcionRows,
  mapNivelSuscripcionToDB,
};
