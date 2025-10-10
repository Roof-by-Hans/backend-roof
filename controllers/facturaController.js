const { promisePool } = require("../config/database");
const {
  mapFacturaRow,
  mapFacturaRows,
  mapFacturaConDetalles,
} = require("../helpers/facturaMapper");
const { mapDetalleFacturaRows } = require("../helpers/detalleFacturaMapper");

/**
 * Obtener todas las facturas
 */
const getFacturas = async (req, res) => {
  try {
    const { estado, desde, hasta } = req.query;

    let query = `
      SELECT f.id_factura,
             f.id_cliente,
             f.id_mesa,
             f.id_grupo,
             f.fecha,
             f.estado,
             f.total,
             c.nombre AS nombre_cliente,
             c.apellido AS apellido_cliente,
             c.email AS email_cliente,
             m.nombre AS nombre_mesa,
             g.nombre AS nombre_grupo
      FROM Factura f
      INNER JOIN Cliente c ON c.id_cliente = f.id_cliente
      LEFT JOIN Mesa m ON m.id_mesa = f.id_mesa
      LEFT JOIN GrupoMesas g ON g.id_grupo = f.id_grupo
      WHERE 1=1
    `;

    const params = [];

    // Filtrar por estado
    if (estado && ["PENDIENTE", "COBRADA", "ANULADA"].includes(estado.toUpperCase())) {
      query += ` AND f.estado = ?`;
      params.push(estado.toUpperCase());
    }

    // Filtrar por rango de fechas
    if (desde) {
      query += ` AND f.fecha >= ?`;
      params.push(desde);
    }

    if (hasta) {
      query += ` AND f.fecha <= ?`;
      params.push(hasta);
    }

    query += ` ORDER BY f.fecha DESC`;

    const [rows] = await promisePool.execute(query, params);

    res.json({
      success: true,
      data: mapFacturaRows(rows),
      message: "Facturas obtenidas correctamente",
    });
  } catch (error) {
    console.error("Error al obtener facturas:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Obtener una factura por ID con sus detalles
 */
const getFacturaPorId = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener la factura
    const [facturaRows] = await promisePool.execute(
      `SELECT f.id_factura,
              f.id_cliente,
              f.id_mesa,
              f.id_grupo,
              f.fecha,
              f.estado,
              f.total,
              c.nombre AS nombre_cliente,
              c.apellido AS apellido_cliente,
              c.email AS email_cliente,
              m.nombre AS nombre_mesa,
              g.nombre AS nombre_grupo
       FROM Factura f
       INNER JOIN Cliente c ON c.id_cliente = f.id_cliente
       LEFT JOIN Mesa m ON m.id_mesa = f.id_mesa
       LEFT JOIN GrupoMesas g ON g.id_grupo = f.id_grupo
       WHERE f.id_factura = ?`,
      [id]
    );

    if (facturaRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Factura no encontrada",
      });
    }

    // Obtener los detalles de la factura
    const [detallesRows] = await promisePool.execute(
      `SELECT df.id_detalle,
              df.id_factura,
              df.id_producto,
              df.cantidad,
              df.precio_unitario,
              df.subtotal,
              p.nombre AS nombre_producto,
              p.descripcion AS descripcion_producto,
              p.foto_principal AS foto_principal_producto,
              cp.nombre AS nombre_categoria
       FROM DetalleFactura df
       INNER JOIN Producto p ON p.id_producto = df.id_producto
       LEFT JOIN CategoriaProducto cp ON cp.id_categoria = p.id_categoria
       WHERE df.id_factura = ?
       ORDER BY df.id_detalle`,
      [id]
    );

    const factura = mapFacturaConDetalles(facturaRows[0], detallesRows);

    res.json({
      success: true,
      data: factura,
      message: "Factura obtenida correctamente",
    });
  } catch (error) {
    console.error("Error al obtener factura:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Obtener facturas de un cliente específico
 */
const getFacturasPorCliente = async (req, res) => {
  try {
    const { idCliente } = req.params;
    const { estado, desde, hasta } = req.query;

    let query = `
      SELECT f.id_factura,
             f.id_cliente,
             f.id_mesa,
             f.id_grupo,
             f.fecha,
             f.estado,
             f.total,
             c.nombre AS nombre_cliente,
             c.apellido AS apellido_cliente,
             c.email AS email_cliente,
             m.nombre AS nombre_mesa,
             g.nombre AS nombre_grupo
      FROM Factura f
      INNER JOIN Cliente c ON c.id_cliente = f.id_cliente
      LEFT JOIN Mesa m ON m.id_mesa = f.id_mesa
      LEFT JOIN GrupoMesas g ON g.id_grupo = f.id_grupo
      WHERE f.id_cliente = ?
    `;

    const params = [idCliente];

    // Filtrar por estado
    if (estado && ["PENDIENTE", "COBRADA", "ANULADA"].includes(estado.toUpperCase())) {
      query += ` AND f.estado = ?`;
      params.push(estado.toUpperCase());
    }

    // Filtrar por rango de fechas
    if (desde) {
      query += ` AND f.fecha >= ?`;
      params.push(desde);
    }

    if (hasta) {
      query += ` AND f.fecha <= ?`;
      params.push(hasta);
    }

    query += ` ORDER BY f.fecha DESC`;

    const [rows] = await promisePool.execute(query, params);

    res.json({
      success: true,
      data: mapFacturaRows(rows),
      message: "Facturas del cliente obtenidas correctamente",
    });
  } catch (error) {
    console.error("Error al obtener facturas del cliente:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Obtener detalles de productos consumidos por un cliente
 * Devuelve un registro único por cada producto consumido
 */
const getProductosConsumidosPorCliente = async (req, res) => {
  try {
    const { idCliente } = req.params;
    const { desde, hasta } = req.query;

    let query = `
      SELECT df.id_producto,
             p.nombre AS nombre_producto,
             p.descripcion AS descripcion_producto,
             p.foto_principal AS foto_principal_producto,
             cp.nombre AS nombre_categoria,
             SUM(df.cantidad) AS total_cantidad,
             SUM(df.subtotal) AS total_gastado,
             COUNT(DISTINCT df.id_factura) AS veces_consumido,
             MAX(f.fecha) AS ultima_compra
      FROM DetalleFactura df
      INNER JOIN Factura f ON f.id_factura = df.id_factura
      INNER JOIN Producto p ON p.id_producto = df.id_producto
      LEFT JOIN CategoriaProducto cp ON cp.id_categoria = p.id_categoria
      WHERE f.id_cliente = ?
        AND f.estado != 'ANULADA'
    `;

    const params = [idCliente];

    // Filtrar por rango de fechas
    if (desde) {
      query += ` AND f.fecha >= ?`;
      params.push(desde);
    }

    if (hasta) {
      query += ` AND f.fecha <= ?`;
      params.push(hasta);
    }

    query += `
      GROUP BY df.id_producto, p.nombre, p.descripcion, p.foto_principal, cp.nombre
      ORDER BY total_gastado DESC
    `;

    const [rows] = await promisePool.execute(query, params);

    const productos = rows.map((row) => ({
      idProducto: row.id_producto,
      nombreProducto: row.nombre_producto,
      descripcion: row.descripcion_producto || null,
      fotoPrincipal: row.foto_principal_producto || null,
      categoria: row.nombre_categoria || null,
      totalCantidad: row.total_cantidad,
      totalGastado: parseFloat(row.total_gastado),
      vecesConsumido: row.veces_consumido,
      ultimaCompra: row.ultima_compra,
    }));

    res.json({
      success: true,
      data: productos,
      message: "Productos consumidos obtenidos correctamente",
    });
  } catch (error) {
    console.error("Error al obtener productos consumidos:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Obtener detalles de una factura específica
 */
const getDetallesFactura = async (req, res) => {
  try {
    const { idFactura } = req.params;

    // Verificar que la factura existe
    const [facturaCheck] = await promisePool.execute(
      `SELECT id_factura FROM Factura WHERE id_factura = ?`,
      [idFactura]
    );

    if (facturaCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Factura no encontrada",
      });
    }

    // Obtener los detalles
    const [rows] = await promisePool.execute(
      `SELECT df.id_detalle,
              df.id_factura,
              df.id_producto,
              df.cantidad,
              df.precio_unitario,
              df.subtotal,
              p.nombre AS nombre_producto,
              p.descripcion AS descripcion_producto,
              p.foto_principal AS foto_principal_producto,
              cp.nombre AS nombre_categoria
       FROM DetalleFactura df
       INNER JOIN Producto p ON p.id_producto = df.id_producto
       LEFT JOIN CategoriaProducto cp ON cp.id_categoria = p.id_categoria
       WHERE df.id_factura = ?
       ORDER BY df.id_detalle`,
      [idFactura]
    );

    res.json({
      success: true,
      data: mapDetalleFacturaRows(rows),
      message: "Detalles de factura obtenidos correctamente",
    });
  } catch (error) {
    console.error("Error al obtener detalles de factura:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

module.exports = {
  getFacturas,
  getFacturaPorId,
  getFacturasPorCliente,
  getProductosConsumidosPorCliente,
  getDetallesFactura,
};
