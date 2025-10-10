/**
 * Mapea una fila de base de datos de DetalleFactura a un objeto de respuesta limpio
 * @param {Object} row - Fila de la base de datos
 * @returns {Object} - Objeto DetalleFactura mapeado
 */
const mapDetalleFacturaRow = (row) => {
  if (!row) return null;

  return {
    id: row.id_detalle,
    idFactura: row.id_factura,
    idProducto: row.id_producto,
    cantidad: row.cantidad,
    precioUnitario: parseFloat(row.precio_unitario),
    subtotal: parseFloat(row.subtotal),
    // Información del producto si está disponible
    ...(row.nombre_producto && {
      producto: {
        id: row.id_producto,
        nombre: row.nombre_producto,
        descripcion: row.descripcion_producto || null,
        fotoPrincipal: row.foto_principal_producto || null,
        categoria: row.nombre_categoria || null,
      },
    }),
  };
};

/**
 * Mapea múltiples filas de base de datos de DetalleFactura
 * @param {Array} rows - Filas de la base de datos
 * @returns {Array} - Array de objetos DetalleFactura mapeados
 */
const mapDetalleFacturaRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map(mapDetalleFacturaRow);
};

module.exports = {
  mapDetalleFacturaRow,
  mapDetalleFacturaRows,
};
