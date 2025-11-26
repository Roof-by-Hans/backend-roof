const toNumberOrNull = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const mapCajaDiariaRow = (row = {}) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id_caja,
    fecha: row.fecha,
    fechaApertura: row.fecha_apertura,
    fechaCierre: row.fecha_cierre,
    montoInicial: toNumberOrNull(row.monto_inicial),
    montoFinal: toNumberOrNull(row.monto_final),
    estado: row.estado,
    creadoPor: row.creado_por,
    cerradoPor: row.cerrado_por,
  };
};

module.exports = {
  mapCajaDiariaRow,
  toNumberOrNull,
};
