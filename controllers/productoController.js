const path = require("path");
const { promisePool } = require("../config/database");
const {
  mapProductoRow,
  mapProductosRows,
} = require("../helpers/productoMapper");
const { deleteFile, getFileUrl } = require("../config/multer");

const normalizeNombre = (nombre) => {
  if (nombre === undefined || nombre === null) return "";
  return String(nombre).trim();
};

const parsePrecio = (valor) => {
  if (valor === undefined) return undefined;

  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    throw new Error("El precio unitario debe ser numérico");
  }

  if (numero < 0) {
    throw new Error("El precio unitario no puede ser negativo");
  }

  return Number(numero.toFixed(2));
};

const parseCategoriaId = (valor) => {
  if (valor === undefined) return undefined;

  const numero = Number(valor);

  if (Number.isNaN(numero) || !Number.isInteger(numero) || numero <= 0) {
    throw new Error("El identificador de la categoría es inválido");
  }

  return numero;
};

const categoriaExiste = async (idCategoria) => {
  const [rows] = await promisePool.execute(
    `SELECT id_categoria
     FROM CategoriaProducto
     WHERE id_categoria = ?
     LIMIT 1`,
    [idCategoria]
  );

  return rows.length > 0;
};

const obtenerProductoPorId = async (id) => {
  const [rows] = await promisePool.execute(
    `SELECT p.id_producto,
            p.nombre,
            p.precio_unitario,
            p.id_categoria,
            p.foto_principal,
            p.descripcion,
            c.nombre AS nombre_categoria
       FROM Producto p
       INNER JOIN CategoriaProducto c ON c.id_categoria = p.id_categoria
      WHERE p.id_producto = ?`,
    [id]
  );

  return rows[0] || null;
};

const getProductos = async (req, res) => {
  try {
    const [rows] = await promisePool.execute(
      `SELECT p.id_producto,
              p.nombre,
              p.precio_unitario,
              p.id_categoria,
              p.foto_principal,
              p.descripcion,
              c.nombre AS nombre_categoria
         FROM Producto p
         INNER JOIN CategoriaProducto c ON c.id_categoria = p.id_categoria
         ORDER BY p.nombre`
    );

    // Agregar URL completa de las imágenes
    const productosConImagenes = rows.map(row => {
      const producto = mapProductoRow(row);
      if (producto.fotoPrincipal) {
        producto.fotoPrincipalUrl = getFileUrl(req, producto.fotoPrincipal, 'productos');
      }
      return producto;
    });

    res.json({
      success: true,
      message: "Productos obtenidos correctamente",
      data: productosConImagenes,
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

const getProductoPorId = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "El identificador del producto no es válido",
      });
    }

    const producto = await obtenerProductoPorId(id);

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    const productoMapeado = mapProductoRow(producto);
    if (productoMapeado.fotoPrincipal) {
      productoMapeado.fotoPrincipalUrl = getFileUrl(req, productoMapeado.fotoPrincipal, 'productos');
    }

    res.json({
      success: true,
      message: "Producto obtenido correctamente",
      data: productoMapeado,
    });
  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

const crearProducto = async (req, res) => {
  try {
    const nombre = normalizeNombre(req.body?.nombre);
    let precioUnitario;
    let idCategoria;
    const fotoPrincipal = req.file ? req.file.filename : null; // Imagen subida con multer
    const descripcion = req.body?.descripcion ?? null;

    try {
      precioUnitario = parsePrecio(
        req.body?.precioUnitario ?? req.body?.precio_unitario
      );
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: parseError.message,
      });
    }

    try {
      idCategoria = parseCategoriaId(
        req.body?.idCategoria ?? req.body?.id_categoria
      );
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: parseError.message,
      });
    }

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: "El nombre del producto es obligatorio",
      });
    }

    if (precioUnitario === undefined) {
      return res.status(400).json({
        success: false,
        message: "El precio unitario es obligatorio",
      });
    }

    if (idCategoria === undefined) {
      return res.status(400).json({
        success: false,
        message: "La categoría asociada es obligatoria",
      });
    }

    const existeCategoria = await categoriaExiste(idCategoria);

    if (!existeCategoria) {
      return res.status(404).json({
        success: false,
        message: "La categoría asociada no existe",
      });
    }

    const [result] = await promisePool.execute(
      `INSERT INTO Producto (nombre, precio_unitario, id_categoria, foto_principal, descripcion)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, precioUnitario, idCategoria, fotoPrincipal, descripcion]
    );

    const productoCreado = await obtenerProductoPorId(result.insertId);

    res.status(201).json({
      success: true,
      message: "Producto creado correctamente",
      data: mapProductoRow(productoCreado),
    });
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

const actualizarProducto = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "El identificador del producto no es válido",
      });
    }

    const productoActual = await obtenerProductoPorId(id);

    if (!productoActual) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    const campos = [];
    const valores = [];

    if (req.body?.nombre !== undefined) {
      const nombreNormalizado = normalizeNombre(req.body.nombre);

      if (!nombreNormalizado) {
        return res.status(400).json({
          success: false,
          message: "El nombre del producto no puede estar vacío",
        });
      }

      campos.push("nombre = ?");
      valores.push(nombreNormalizado);
    }

    if (
      req.body?.precioUnitario !== undefined ||
      req.body?.precio_unitario !== undefined
    ) {
      let nuevoPrecio;

      try {
        nuevoPrecio = parsePrecio(
          req.body?.precioUnitario ?? req.body?.precio_unitario
        );
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: parseError.message,
        });
      }

      campos.push("precio_unitario = ?");
      valores.push(nuevoPrecio);
    }

    if (
      req.body?.idCategoria !== undefined ||
      req.body?.id_categoria !== undefined
    ) {
      let nuevaCategoria;

      try {
        nuevaCategoria = parseCategoriaId(
          req.body?.idCategoria ?? req.body?.id_categoria
        );
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: parseError.message,
        });
      }

      const existeCategoria = await categoriaExiste(nuevaCategoria);

      if (!existeCategoria) {
        return res.status(404).json({
          success: false,
          message: "La categoría asociada no existe",
        });
      }

      campos.push("id_categoria = ?");
      valores.push(nuevaCategoria);
    }

    // Manejar imagen (nueva imagen o eliminación)
    const eliminarImagen = req.body?.eliminarImagen === 'true' || req.body?.eliminarImagen === true;
    
    if (req.file) {
      // Si hay una imagen anterior, eliminarla
      if (productoActual.foto_principal) {
        const rutaImagenAnterior = path.join(__dirname, '..', 'uploads', 'productos', productoActual.foto_principal);
        await deleteFile(rutaImagenAnterior);
      }
      
      campos.push("foto_principal = ?");
      valores.push(req.file.filename);
    } else if (eliminarImagen) {
      // Si se solicita eliminar la imagen sin subir una nueva
      if (productoActual.foto_principal) {
        const rutaImagenAnterior = path.join(__dirname, '..', 'uploads', 'productos', productoActual.foto_principal);
        await deleteFile(rutaImagenAnterior);
      }
      
      campos.push("foto_principal = ?");
      valores.push(null);
    }

    if (req.body?.descripcion !== undefined) {
      campos.push("descripcion = ?");
      valores.push(req.body.descripcion || null);
    }

    if (campos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar al menos un campo para actualizar",
      });
    }

    valores.push(id);

    await promisePool.execute(
      `UPDATE Producto
       SET ${campos.join(", ")}
       WHERE id_producto = ?`,
      valores
    );

    const productoActualizado = await obtenerProductoPorId(id);
    const productoMapeado = mapProductoRow(productoActualizado);
    
    if (productoMapeado.fotoPrincipal) {
      productoMapeado.fotoPrincipalUrl = getFileUrl(req, productoMapeado.fotoPrincipal, 'productos');
    }

    res.json({
      success: true,
      message: "Producto actualizado correctamente",
      data: productoMapeado,
    });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

const eliminarProducto = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "El identificador del producto no es válido",
      });
    }

    // Obtener el producto para eliminar la imagen asociada
    const productoAEliminar = await obtenerProductoPorId(id);

    if (!productoAEliminar) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    // Eliminar el producto de la base de datos
    const [result] = await promisePool.execute(
      `DELETE FROM Producto
       WHERE id_producto = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    // Eliminar la imagen asociada si existe
    if (productoAEliminar.foto_principal) {
      const rutaImagen = path.join(__dirname, '..', 'uploads', 'productos', productoAEliminar.foto_principal);
      await deleteFile(rutaImagen);
    }

    res.json({
      success: true,
      message: "Producto eliminado correctamente",
      data: { id },
    });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

module.exports = {
  getProductos,
  getProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
};
