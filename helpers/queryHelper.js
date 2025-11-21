const { promisePool } = require("../config/database");

/**
 * Queries SQL reutilizables para evitar duplicación
 */
const QUERIES = {
  TARJETA_COMPLETA: `
    SELECT t.id_tarjeta,
           t.uuid,
           t.id_tipo_suscripcion,
           ts.nombre AS nombre_tipo_suscripcion,
           t.id_nivel_suscripcion,
           ns.nombre AS nombre_nivel_suscripcion,
           ns.limite_credito AS limite_credito_nivel,
           t.saldo_actual
    FROM Tarjeta t
    LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
    LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
  `,

  CLIENTE_COMPLETO: `
    SELECT c.id_cliente,
           c.nombre,
           c.apellido,
           c.telefono,
           c.email,
           c.id_tarjeta,
           c.foto_perfil,
           c.preferencias,
           t.uuid AS tarjeta_uuid
    FROM Cliente c
    LEFT JOIN Tarjeta t ON t.id_tarjeta = c.id_tarjeta
  `,

  PRODUCTO_COMPLETO: `
    SELECT p.id_producto,
           p.nombre,
           p.precio_unitario,
           p.id_categoria,
           p.foto_principal,
           p.descripcion,
           c.nombre AS nombre_categoria
    FROM Producto p
    INNER JOIN CategoriaProducto c ON c.id_categoria = p.id_categoria
  `,
};

/**
 * Construye query de tarjeta con condiciones opcionales
 * @param {string} whereClause - Cláusula WHERE (sin la palabra WHERE)
 * @param {string} orderBy - Cláusula ORDER BY (sin las palabras ORDER BY)
 * @returns {string} Query completa
 */
const getTarjetaQuery = (whereClause = "", orderBy = "") => {
  let query = QUERIES.TARJETA_COMPLETA;
  if (whereClause) query += ` WHERE ${whereClause}`;
  if (orderBy) query += ` ORDER BY ${orderBy}`;
  return query;
};

/**
 * Construye query de cliente con condiciones opcionales
 * @param {string} whereClause - Cláusula WHERE (sin la palabra WHERE)
 * @param {string} orderBy - Cláusula ORDER BY (sin las palabras ORDER BY)
 * @returns {string} Query completa
 */
const getClienteQuery = (whereClause = "", orderBy = "") => {
  let query = QUERIES.CLIENTE_COMPLETO;
  if (whereClause) query += ` WHERE ${whereClause}`;
  if (orderBy) query += ` ORDER BY ${orderBy}`;
  return query;
};

/**
 * Construye query de producto con condiciones opcionales
 * @param {string} whereClause - Cláusula WHERE (sin la palabra WHERE)
 * @param {string} orderBy - Cláusula ORDER BY (sin las palabras ORDER BY)
 * @returns {string} Query completa
 */
const getProductoQuery = (whereClause = "", orderBy = "") => {
  let query = QUERIES.PRODUCTO_COMPLETO;
  if (whereClause) query += ` WHERE ${whereClause}`;
  if (orderBy) query += ` ORDER BY ${orderBy}`;
  return query;
};

/**
 * Ejecuta query de tarjeta y retorna el primer resultado
 * @param {string} whereClause - Cláusula WHERE
 * @param {Array} params - Parámetros para la query
 * @returns {Promise<Object|null>} Tarjeta o null
 */
const getTarjetaById = async (id) => {
  const [rows] = await promisePool.execute(
    getTarjetaQuery("t.id_tarjeta = ?"),
    [id]
  );
  return rows[0] || null;
};

/**
 * Ejecuta query de cliente y retorna el primer resultado
 * @param {number} id - ID del cliente
 * @returns {Promise<Object|null>} Cliente o null
 */
const getClienteById = async (id) => {
  const [rows] = await promisePool.execute(
    getClienteQuery("c.id_cliente = ?"),
    [id]
  );
  return rows[0] || null;
};

/**
 * Ejecuta query de producto y retorna el primer resultado
 * @param {number} id - ID del producto
 * @returns {Promise<Object|null>} Producto o null
 */
const getProductoById = async (id) => {
  const [rows] = await promisePool.execute(
    getProductoQuery("p.id_producto = ?"),
    [id]
  );
  return rows[0] || null;
};

module.exports = {
  QUERIES,
  getTarjetaQuery,
  getClienteQuery,
  getProductoQuery,
  getTarjetaById,
  getClienteById,
  getProductoById,
};
