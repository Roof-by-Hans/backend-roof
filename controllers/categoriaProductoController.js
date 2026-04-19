const { promisePool } = require("../config/database");
const {
  mapCategoriaRow,
  buildCategoriasTree,
  findCategoriaInTree,
} = require("../helpers/categoriaProductoMapper");

const fetchCategorias = async () => {
  const [rows] = await promisePool.execute(
    `SELECT id_categoria, nombre, id_cat_padre
     FROM CategoriaProducto
     WHERE habilitar = 1`
  );

  return rows;
};

const fetchAllCategorias = async () => {
  const [rows] = await promisePool.execute(
    `SELECT id_categoria, nombre, id_cat_padre, habilitar
     FROM CategoriaProducto
     ORDER BY habilitar DESC, nombre ASC`
  );

  return rows;
};

const normalizeNombre = (nombre) => {
  if (nombre === undefined || nombre === null) return "";
  return String(nombre).trim();
};

const parseParentId = (valor) => {
  if (valor === undefined) return undefined;
  if (valor === null || valor === "" || valor === 0 || valor === "0") {
    return null;
  }

  const numero = Number(valor);
  if (Number.isNaN(numero) || numero < 1) {
    throw new Error("El identificador de la categoría padre es inválido");
  }

  return numero;
};

/**
 * Obtener todas las categorías
 * @query {string} estado - Filtro por estado: 'habilitados' (default), 'deshabilitados', 'todos'
 */
const getCategorias = async (req, res) => {
  try {
    const { estado } = req.query;

    // Obtener todas las categorías con su estado de habilitación
    const todasLasCategorias = await fetchAllCategorias();

    // Filtrar según el parámetro estado
    let categoriasFiltradas = todasLasCategorias;
    if (estado === "habilitados") {
      categoriasFiltradas = todasLasCategorias.filter(c => c.habilitar === 1);
    } else if (estado === "deshabilitados") {
      categoriasFiltradas = todasLasCategorias.filter(c => c.habilitar === 0);
    }
    // Si estado es 'todos' o no se envía parámetro, usa todasLasCategorias (trae todos)

    // tree siempre se construye con las habilitadas (para mostrar la jerarquía válida)
    const categoriasHabilitadas = todasLasCategorias.filter(c => c.habilitar === 1);
    const tree = buildCategoriasTree(categoriasHabilitadas);

    // enabled siempre contiene solo las habilitadas
    const categoriasSoloHabilitadas = todasLasCategorias.filter(c => c.habilitar === 1);

    res.json({
      success: true,
      message: "Categorías obtenidas correctamente",
      data: {
        tree: tree,
        flat: todasLasCategorias.map(c => mapCategoriaRow(c)),
        enabled: categoriasSoloHabilitadas.map(c => mapCategoriaRow(c)),
      },
      filtros: {
        applied: estado || "todos",
        totalResults: categoriasFiltradas.length,
      },
    });
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

const getCategoriaPorId = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "El identificador de la categoría no es válido",
      });
    }

    const rows = await fetchCategorias();
    const tree = buildCategoriasTree(rows);
    const categoria = findCategoriaInTree(tree, id);

    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    res.json({
      success: true,
      message: "Categoría obtenida correctamente",
      data: categoria,
    });
  } catch (error) {
    console.error("Error al obtener categoría:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

const crearCategoria = async (req, res) => {
  try {
    const nombre = normalizeNombre(req.body?.nombre);
    let idCatPadre;

    try {
      idCatPadre = parseParentId(req.body?.idCatPadre);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: parseError.message,
      });
    }

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: "El nombre de la categoría es obligatorio",
      });
    }

    if (idCatPadre !== undefined && idCatPadre !== null) {
      const [padres] = await promisePool.execute(
        `SELECT id_categoria
         FROM CategoriaProducto
         WHERE id_categoria = ?`,
        [idCatPadre]
      );

      if (padres.length === 0) {
        return res.status(404).json({
          success: false,
          message: "La categoría padre no existe",
        });
      }
    }

    const [result] = await promisePool.execute(
      `INSERT INTO CategoriaProducto (nombre, id_cat_padre)
       VALUES (?, ?)`,
      [nombre, idCatPadre ?? null]
    );

    const nuevaCategoria = mapCategoriaRow({
      id_categoria: result.insertId,
      nombre,
      id_cat_padre: idCatPadre ?? null,
      children: [],
    });

    res.status(201).json({
      success: true,
      message: "Categoría creada correctamente",
      data: nuevaCategoria,
    });
  } catch (error) {
    console.error("Error al crear categoría:", error);

    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

const actualizarCategoria = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "El identificador de la categoría no es válido",
      });
    }

    const { nombre } = req.body ?? {};
    let { idCatPadre } = req.body ?? {};

    const campos = [];
    const valores = [];

    if (nombre !== undefined) {
      const nombreNormalizado = normalizeNombre(nombre);

      if (!nombreNormalizado) {
        return res.status(400).json({
          success: false,
          message: "El nombre de la categoría no puede estar vacío",
        });
      }

      campos.push("nombre = ?");
      valores.push(nombreNormalizado);
    }

    let nuevoPadre;

    if (idCatPadre !== undefined) {
      try {
        nuevoPadre = parseParentId(idCatPadre);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: parseError.message,
        });
      }

      if (nuevoPadre === id) {
        return res.status(400).json({
          success: false,
          message: "Una categoría no puede ser su propio padre",
        });
      }

      campos.push("id_cat_padre = ?");
      valores.push(nuevoPadre ?? null);
    }

    if (campos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar al menos un campo para actualizar",
      });
    }

    const [existentes] = await promisePool.execute(
      `SELECT id_categoria, id_cat_padre
       FROM CategoriaProducto`
    );

    const categoriaActual = existentes.find((row) => row.id_categoria === id);

    if (!categoriaActual) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    if (nuevoPadre !== undefined) {
      if (nuevoPadre !== null) {
        const categoriaPadre = existentes.find(
          (row) => row.id_categoria === nuevoPadre
        );

        if (!categoriaPadre) {
          return res.status(404).json({
            success: false,
            message: "La categoría padre no existe",
          });
        }

        let current = nuevoPadre;
        const mapaPadres = new Map(
          existentes.map((row) => [row.id_categoria, row.id_cat_padre ?? null])
        );

        while (current) {
          if (current === id) {
            return res.status(400).json({
              success: false,
              message:
                "No es posible asignar como padre a una categoría descendiente",
            });
          }
          current = mapaPadres.get(current) ?? null;
        }
      }
    }

    valores.push(id);

    const [result] = await promisePool.execute(
      `UPDATE CategoriaProducto
       SET ${campos.join(", ")}
       WHERE id_categoria = ?`,
      valores
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    const [rows] = await promisePool.execute(
      `SELECT id_categoria, nombre, id_cat_padre
       FROM CategoriaProducto
       WHERE id_categoria = ?`,
      [id]
    );

    const categoriaActualizada = mapCategoriaRow({
      ...rows[0],
      children: [],
    });

    res.json({
      success: true,
      message: "Categoría actualizada correctamente",
      data: categoriaActualizada,
    });
  } catch (error) {
    console.error("Error al actualizar categoría:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

const eliminarCategoria = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "El identificador de la categoría no es válido",
      });
    }

    // Verificar si la categoría existe y está habilitada
    const [existe] = await promisePool.execute(
      `SELECT id_categoria FROM CategoriaProducto WHERE id_categoria = ? AND habilitar = 1`,
      [id]
    );

    if (existe.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    // Borrado lógico: marcar como deshabilitada
    const [result] = await promisePool.execute(
      `UPDATE CategoriaProducto SET habilitar = 0 WHERE id_categoria = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    res.json({
      success: true,
      message: "Categoría deshabilitada correctamente",
      data: { id },
    });
  } catch (error) {
    console.error("Error al eliminar categoría:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

const toggleCategoria = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "El identificador de la categoría no es válido",
      });
    }

    // Verificar que la categoría existe
    const [categorias] = await promisePool.execute(
      `SELECT id_categoria, nombre, habilitar FROM CategoriaProducto WHERE id_categoria = ?`,
      [id]
    );

    if (categorias.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    // Toggle: cambiar habilitar de 1 a 0 o de 0 a 1
    const nuevoEstado = categorias[0].habilitar === 1 ? 0 : 1;

    // Si se está intentando deshabilitar, verificar que no tenga productos asociados
    if (nuevoEstado === 0) {
      const [productos] = await promisePool.execute(
        `SELECT COUNT(*) as cantidad FROM Producto WHERE id_categoria = ?`,
        [id]
      );

      if (productos[0].cantidad > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede deshabilitar la categoría porque tiene ${productos[0].cantidad} producto(s) asociado(s). Desasocie los productos primero.`,
        });
      }
    }

    await promisePool.execute(
      `UPDATE CategoriaProducto SET habilitar = ? WHERE id_categoria = ?`,
      [nuevoEstado, id]
    );

    res.json({
      success: true,
      message: nuevoEstado === 1 ? "Categoría habilitada correctamente" : "Categoría deshabilitada correctamente",
      data: { id, habilitar: nuevoEstado },
    });
  } catch (error) {
    console.error("Error al toggle categoría:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

module.exports = {
  getCategorias,
  getCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  toggleCategoria,
};
