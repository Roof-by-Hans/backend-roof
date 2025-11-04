const normalizeNombre = (valor) => {
  if (valor === undefined || valor === null) return "";
  return String(valor).trim();
};

const mapMesaConGrupoRow = (row = {}) => {
  if (!row) return null;

  const grupo =
    row.id_grupo !== null && row.id_grupo !== undefined
      ? {
          id: row.id_grupo,
          nombre: normalizeNombre(row.nombre_grupo),
        }
      : null;

  return {
    idMesa: row.id_mesa,
    nombreMesa: normalizeNombre(row.nombre_mesa ?? row.nombre),
    estado: row.estado_mesa || row.estado || 'DISPONIBLE',
    idClienteActual: row.id_cliente_actual || null,
    posX: row.posX !== undefined ? row.posX : 50,
    posY: row.posY !== undefined ? row.posY : 50,
    grupo,
  };
};

const mapMesaConGrupoRows = (rows = []) =>
  rows.map(mapMesaConGrupoRow).filter((mesa) => mesa !== null);

const mapGrupoRow = (row = {}) => {
  if (!row) return null;

  return {
    id: row.id_grupo,
    nombre: normalizeNombre(row.nombre),
  };
};

const mapMesaRow = (row = {}) => {
  if (!row) return null;

  return {
    id: row.id_mesa,
    nombre: normalizeNombre(row.nombre ?? row.nombre_mesa),
    estado: row.estado || 'DISPONIBLE',
    idClienteActual: row.id_cliente_actual || null,
    posX: row.posX !== undefined ? row.posX : 50,
    posY: row.posY !== undefined ? row.posY : 50,
  };
};

const buildGrupoDetalle = (grupoRow = {}, mesasRows = []) => {
  const grupo = mapGrupoRow(grupoRow);

  if (!grupo) return null;

  return {
    ...grupo,
    mesas: mesasRows
      .map(mapMesaRow)
      .filter((mesa) => mesa !== null)
      .sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
      ),
  };
};

module.exports = {
  normalizeNombre,
  mapMesaConGrupoRows,
  mapGrupoRow,
  mapMesaRow,
  buildGrupoDetalle,
};
