const normalizeNombre = (valor) => {
  if (valor === undefined || valor === null) return "";
  return String(valor);
};

const mapCategoriaRow = (row = {}) => {
  if (!row) return null;

  return {
    id: row.id_categoria,
    nombre: normalizeNombre(row.nombre),
    idCatPadre: row.id_cat_padre ?? null,
    children: Array.isArray(row.children) ? row.children : [],
  };
};

const mapCategoriasRows = (rows = []) => rows.map(mapCategoriaRow);

const buildCategoriasTree = (rows = []) => {
  const nodes = new Map();
  const roots = [];

  rows.forEach((row) => {
    const node = {
      id: row.id_categoria,
      nombre: normalizeNombre(row.nombre),
      idCatPadre: row.id_cat_padre ?? null,
      children: [],
    };

    nodes.set(node.id, node);
  });

  rows.forEach((row) => {
    const node = nodes.get(row.id_categoria);
    const parentId = row.id_cat_padre ?? null;

    if (parentId && nodes.has(parentId)) {
      const parent = nodes.get(parentId);
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return sortCategoriaTree(roots);
};

const sortCategoriaTree = (nodes = []) => {
  const sorted = [...nodes].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
  );

  return sorted.map((node) => ({
    ...node,
    children: sortCategoriaTree(node.children || []),
  }));
};

const findCategoriaInTree = (nodes = [], id) => {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const found = findCategoriaInTree(node.children, id);
    if (found) return found;
  }

  return null;
};

module.exports = {
  mapCategoriaRow,
  mapCategoriasRows,
  buildCategoriasTree,
  findCategoriaInTree,
  sortCategoriaTree,
};
