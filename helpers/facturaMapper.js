const { mapDetalleFacturaRows } = require("./detalleFacturaMapper");

/**
 * Mapea una fila de base de datos de Factura a un objeto de respuesta limpio
 * @param {Object} row - Fila de la base de datos
 * @returns {Object} - Objeto Factura mapeado
 */
const mapFacturaRow = (row) => {
  if (!row) return null;

  return {
    id: row.id_factura,
    idCliente: row.id_cliente,
    idMesa: row.id_mesa || null,
    idGrupo: row.id_grupo || null,
    fecha: row.fecha,
    estado: row.estado,
    total: parseFloat(row.total),
    // Información del cliente si está disponible
    ...(row.nombre_cliente && {
      cliente: {
        id: row.id_cliente,
        nombre: row.nombre_cliente,
        apellido: row.apellido_cliente,
        email: row.email_cliente,
      },
    }),
    // Información de la mesa si está disponible
    ...(row.nombre_mesa && {
      mesa: {
        id: row.id_mesa,
        nombre: row.nombre_mesa,
      },
    }),
    // Información del grupo si está disponible
    ...(row.nombre_grupo && {
      grupo: {
        id: row.id_grupo,
        nombre: row.nombre_grupo,
      },
    }),
  };
};

/**
 * Mapea múltiples filas de base de datos de Factura
 * @param {Array} rows - Filas de la base de datos
 * @returns {Array} - Array de objetos Factura mapeados
 */
const mapFacturaRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map(mapFacturaRow);
};

/**
 * Mapea una factura con sus detalles incluidos
 * @param {Object} facturaRow - Fila de la factura
 * @param {Array} detallesRows - Filas de los detalles
 * @returns {Object} - Objeto Factura con detalles mapeado
 */
const mapFacturaConDetalles = (facturaRow, detallesRows) => {
  if (!facturaRow) return null;

  const factura = mapFacturaRow(facturaRow);
  factura.detalles = mapDetalleFacturaRows(detallesRows);

  return factura;
};

module.exports = {
  mapFacturaRow,
  mapFacturaRows,
  mapFacturaConDetalles,
};
