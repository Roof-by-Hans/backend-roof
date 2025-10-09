const normalizeNombre = (valor) => {
  if (valor === undefined || valor === null) return "";
  return String(valor).trim();
};

const parsePrecio = (valor) => {
  if (valor === undefined || valor === null) return null;
  const numero = Number(valor);
  return Number.isNaN(numero) ? null : Number(numero.toFixed(2));
};

const mapProductoRow = (row = {}) => {
  if (!row) return null;

  const precio = parsePrecio(row.precio_unitario ?? row.precioUnitario);
  const idCategoria = row.id_categoria ?? row.idCategoria ?? null;
  const nombreCategoria = row.nombre_categoria ?? row.nombreCategoria ?? null;

  return {
    id: row.id_producto ?? row.id,
    nombre: normalizeNombre(row.nombre),
    precioUnitario: precio,
    idCategoria,
    fotoPrincipal: row.foto_principal ?? row.fotoPrincipal ?? null,
    descripcion: row.descripcion ?? null,
    categoria:
      nombreCategoria !== null && nombreCategoria !== undefined
        ? {
            id: idCategoria,
            nombre: normalizeNombre(nombreCategoria),
          }
        : null,
  };
};

const mapProductosRows = (rows = []) => rows.map(mapProductoRow);

module.exports = {
  mapProductoRow,
  mapProductosRows,
};
