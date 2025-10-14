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
    idTarjeta: row.id_tarjeta || null,
    fecha: row.fecha,
    monto: parseFloat(row.monto),
    tipoMovimiento: row.tipo_movimiento,
    idTipoMov: row.id_tipo_mov || null,
    idFactura: row.id_factura || null,
    idMovCaja: row.id_mov_caja || null,
    idUsuario: row.id_usuario || null,
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
    // Información adicional de la tarjeta si está disponible
    ...(row.tarjeta_uuid && {
      tarjeta: {
        id: row.id_tarjeta,
        uuid: row.tarjeta_uuid,
        saldoActual: row.tarjeta_saldo ? parseFloat(row.tarjeta_saldo) : null,
      },
    }),
    // Información adicional del tipo de movimiento si está disponible
    ...(row.tipo_movimiento_nombre && {
      tipoMovimientoDetalle: {
        id: row.id_tipo_mov,
        nombre: row.tipo_movimiento_nombre,
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
    // Información adicional del usuario si está disponible
    ...(row.usuario_nombre && {
      usuario: {
        id: row.id_usuario,
        nombreUsuario: row.usuario_nombre,
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
