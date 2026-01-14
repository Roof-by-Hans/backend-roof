/**
 * Mapea una fila de base de datos de Cliente a un objeto de respuesta limpio
 * @param {Object} row - Fila de la base de datos
 * @returns {Object} - Objeto Cliente mapeado
 */
const mapClienteRow = (row) => {
  if (!row) return null;

  // Construir URL de foto de perfil si existe
  const fotoPerfilUrl = row.foto_perfil
    ? `${process.env.API_URL || "http://localhost:3000"}/uploads/clientes/${
        row.foto_perfil
      }`
    : null;

  return {
    id: row.id_cliente,
    nombre: row.nombre,
    apellido: row.apellido,
    telefono: row.telefono || null,
    email: row.email || null,
    idTarjeta: row.id_tarjeta || null,
    fotoPerfil: row.foto_perfil || null,
    fotoPerfilUrl: fotoPerfilUrl,
    preferencias: row.preferencias || null,
    // Si hay información de tarjeta relacionada
    ...(row.tarjeta_uuid && {
      tarjeta: {
        id: row.id_tarjeta,
        uuid: row.tarjeta_uuid,
        saldoActual: parseFloat(row.saldo_actual || 0),
        tipoSuscripcion: row.tipo_suscripcion || null,
        nivelSuscripcion: row.nivel_suscripcion || null,
        limiteCredito: parseFloat(row.limite_credito || 0),
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
