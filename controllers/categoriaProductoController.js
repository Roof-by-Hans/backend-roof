const { promisePool } = require("../config/database");
const {
  mapCategoriaRow,
  buildCategoriasTree,
  findCategoriaInTree,
} = require("../helpers/categoriaProductoMapper");

const fetchCategorias = async () => {
  const [rows] = await promisePool.execute(
    `SELECT id_categoria, nombre, id_cat_padre
     FROM CategoriaProducto`
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

const getCategorias = async (req, res) => {
  try {
    const rows = await fetchCategorias();
    const tree = buildCategoriasTree(rows);

    res.json({
      success: true,
      message: "Categorías obtenidas correctamente",
      data: tree,
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

    const [result] = await promisePool.execute(
      `DELETE FROM CategoriaProducto
       WHERE id_categoria = ?`,
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
      message: "Categoría eliminada correctamente",
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

module.exports = {
  getCategorias,
  getCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
};
