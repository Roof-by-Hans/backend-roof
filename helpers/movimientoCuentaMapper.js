/**
 * Mapea una fila de base de datos de MovimientoCuenta a un objeto de respuesta limpio
 * @param {Object} row - Fila de la base de datos
 * @returns {Object} - Objeto MovimientoCuenta mapeado
 */
const mapMovimientoCuentaRow = (row) => {
  if (!row) return null;

  return {
    id: row.id_movimiento,
    idCliente: row.id_cliente,
    fecha: row.fecha,
    monto: parseFloat(row.monto),
    tipoMovimiento: row.tipo_movimiento,
    idFactura: row.id_factura || null,
    observaciones: row.observaciones || null,
    // Información adicional del cliente si está disponible
    ...(row.nombre_cliente && {
      cliente: {
        id: row.id_cliente,
        nombre: row.nombre_cliente,
        apellido: row.apellido_cliente,
        email: row.email_cliente,
      },
    }),
    // Información adicional de la factura si está disponible
    ...(row.total_factura && {
      factura: {
        id: row.id_factura,
        total: parseFloat(row.total_factura),
        estado: row.estado_factura,
      },
    }),
  };
};

/**
 * Mapea múltiples filas de base de datos de MovimientoCuenta
 * @param {Array} rows - Filas de la base de datos
 * @returns {Array} - Array de objetos MovimientoCuenta mapeados
 */
const mapMovimientoCuentaRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map(mapMovimientoCuentaRow);
};

module.exports = {
  mapMovimientoCuentaRow,
  mapMovimientoCuentaRows,
};
