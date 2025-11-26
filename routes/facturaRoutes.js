const express = require("express");
const router = express.Router();
const {
  getFacturas,
  getFacturaPorId,
  getFacturasPorCliente,
  getProductosConsumidosPorCliente,
  getDetallesFactura,
  getFacturasPendientes,
  updateEstadoFactura,
} = require("../controllers/facturaController");
const {
  authenticate,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Facturas
 *   description: Endpoints para gestionar facturas y consumos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Factura:
 *       type: object
 *       required:
 *         - id
 *         - idCliente
 *         - fecha
 *         - estado
 *         - total
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único de la factura
 *           example: 1
 *         idCliente:
 *           type: integer
 *           description: ID del cliente
 *           example: 5
 *         idMesa:
 *           type: integer
 *           nullable: true
 *           description: ID de la mesa
 *           example: 3
 *         idGrupo:
 *           type: integer
 *           nullable: true
 *           description: ID del grupo de mesas
 *           example: 1
 *         fecha:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la factura
 *           example: "2025-10-10T14:30:00.000Z"
 *         estado:
 *           type: string
 *           enum: [PENDIENTE, COBRADA, ANULADA]
 *           description: Estado de la factura
 *           example: COBRADA
 *         total:
 *           type: number
 *           format: float
 *           description: Total de la factura
 *           example: 250.50
 *         cliente:
 *           type: object
 *           description: Información del cliente
 *           properties:
 *             id:
 *               type: integer
 *               example: 5
 *             nombre:
 *               type: string
 *               example: "Juan"
 *             apellido:
 *               type: string
 *               example: "Pérez"
 *             email:
 *               type: string
 *               example: "juan.perez@email.com"
 *         mesa:
 *           type: object
 *           nullable: true
 *           description: Información de la mesa
 *           properties:
 *             id:
 *               type: integer
 *               example: 3
 *             nombre:
 *               type: string
 *               example: "Mesa 3"
 *         grupo:
 *           type: object
 *           nullable: true
 *           description: Información del grupo de mesas
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *             nombre:
 *               type: string
 *               example: "Terraza"
 *         detalles:
 *           type: array
 *           description: Detalles de productos en la factura
 *           items:
 *             $ref: '#/components/schemas/DetalleFactura'
 *     DetalleFactura:
 *       type: object
 *       required:
 *         - id
 *         - idFactura
 *         - idProducto
 *         - cantidad
 *         - precioUnitario
 *         - subtotal
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único del detalle
 *           example: 1
 *         idFactura:
 *           type: integer
 *           description: ID de la factura
 *           example: 1
 *         idProducto:
 *           type: integer
 *           description: ID del producto
 *           example: 10
 *         cantidad:
 *           type: integer
 *           description: Cantidad del producto
 *           example: 2
 *         precioUnitario:
 *           type: number
 *           format: float
 *           description: Precio unitario del producto
 *           example: 50.00
 *         subtotal:
 *           type: number
 *           format: float
 *           description: Subtotal (cantidad x precio unitario)
 *           example: 100.00
 *         producto:
 *           type: object
 *           description: Información del producto
 *           properties:
 *             id:
 *               type: integer
 *               example: 10
 *             nombre:
 *               type: string
 *               example: "Hamburguesa Clásica"
 *             descripcion:
 *               type: string
 *               nullable: true
 *               example: "Hamburguesa con queso y vegetales"
 *             fotoPrincipal:
 *               type: string
 *               nullable: true
 *               example: "https://example.com/foto.jpg"
 *             categoria:
 *               type: string
 *               nullable: true
 *               example: "Comidas"
 */

/**
 * @swagger
 * /api/facturas:
 *   get:
 *     summary: Obtener todas las facturas
 *     tags: [Facturas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [PENDIENTE, COBRADA, ANULADA]
 *         description: Filtrar por estado de la factura
 *       - in: query
 *         name: desde
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicial del rango (YYYY-MM-DD)
 *       - in: query
 *         name: hasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha final del rango (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lista de facturas obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Factura'
 *                 message:
 *                   type: string
 *                   example: "Facturas obtenidas correctamente"
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", authenticate, authorizeAdmin, getFacturas);

/**
 * @swagger
 * /api/facturas/cliente/{idCliente}:
 *   get:
 *     summary: Obtener facturas de un cliente específico
 *     tags: [Facturas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idCliente
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [PENDIENTE, COBRADA, ANULADA]
 *         description: Filtrar por estado de la factura
 *       - in: query
 *         name: desde
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicial del rango (YYYY-MM-DD)
 *       - in: query
 *         name: hasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha final del rango (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Facturas del cliente obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Factura'
 *                 message:
 *                   type: string
 *                   example: "Facturas del cliente obtenidas correctamente"
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/cliente/:idCliente",
  authenticate,
  authorizeAdmin,
  getFacturasPorCliente
);

/**
 * @swagger
 * /api/facturas/cliente/{idCliente}/productos-consumidos:
 *   get:
 *     summary: Obtener productos consumidos por un cliente (registro único por producto)
 *     description: Devuelve estadísticas agregadas de cada producto consumido por el cliente
 *     tags: [Facturas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idCliente
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *       - in: query
 *         name: desde
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicial del rango (YYYY-MM-DD)
 *       - in: query
 *         name: hasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha final del rango (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Productos consumidos obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       idProducto:
 *                         type: integer
 *                         example: 10
 *                       nombreProducto:
 *                         type: string
 *                         example: "Hamburguesa Clásica"
 *                       descripcion:
 *                         type: string
 *                         nullable: true
 *                         example: "Hamburguesa con queso"
 *                       fotoPrincipal:
 *                         type: string
 *                         nullable: true
 *                         example: "https://example.com/foto.jpg"
 *                       categoria:
 *                         type: string
 *                         nullable: true
 *                         example: "Comidas"
 *                       totalCantidad:
 *                         type: integer
 *                         description: Cantidad total consumida
 *                         example: 15
 *                       totalGastado:
 *                         type: number
 *                         format: float
 *                         description: Total gastado en este producto
 *                         example: 750.00
 *                       vecesConsumido:
 *                         type: integer
 *                         description: Cantidad de facturas con este producto
 *                         example: 8
 *                       ultimaCompra:
 *                         type: string
 *                         format: date-time
 *                         description: Fecha de la última compra
 *                         example: "2025-10-10T14:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "Productos consumidos obtenidos correctamente"
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/cliente/:idCliente/productos-consumidos",
  authenticate,
  authorizeAdmin,
  getProductosConsumidosPorCliente
);

/**
 * @swagger
 * /api/facturas/{idFactura}/detalles:
 *   get:
 *     summary: Obtener detalles de una factura específica
 *     tags: [Facturas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idFactura
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la factura
 *     responses:
 *       200:
 *         description: Detalles de factura obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DetalleFactura'
 *                 message:
 *                   type: string
 *                   example: "Detalles de factura obtenidos correctamente"
 *       404:
 *         description: Factura no encontrada
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/:idFactura/detalles",
  authenticate,
  authorizeAdmin,
  getDetallesFactura
);

/**
 * @swagger
 * /api/facturas/pendientes:
 *   get:
 *     summary: Obtener todas las facturas pendientes
 *     description: Obtiene todas las facturas con estado PENDIENTE, útil para gestionar pedidos activos
 *     tags: [Facturas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de facturas pendientes obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Factura'
 *                 message:
 *                   type: string
 *                   example: "Facturas pendientes obtenidas correctamente"
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/pendientes", authenticate, authorizeAdmin, getFacturasPendientes);

/**
 * @swagger
 * /api/facturas/{id}:
 *   get:
 *     summary: Obtener una factura por ID con sus detalles
 *     tags: [Facturas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la factura
 *     responses:
 *       200:
 *         description: Factura obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Factura'
 *                 message:
 *                   type: string
 *                   example: "Factura obtenida correctamente"
 *       404:
 *         description: Factura no encontrada
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/:id", authenticate, authorizeAdmin, getFacturaPorId);

/**
 * @swagger
 * /api/facturas/{id}/estado:
 *   patch:
 *     summary: Actualizar estado de una factura (sin pagar)
 *     description: Permite cambiar el estado de una factura entre PENDIENTE y ANULADA
 *     tags: [Facturas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la factura
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estado
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [PENDIENTE, ANULADA]
 *                 description: Nuevo estado de la factura
 *                 example: "ANULADA"
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Factura'
 *                 message:
 *                   type: string
 *                   example: "Estado de factura actualizado correctamente"
 *       400:
 *         description: Estado inválido
 *       404:
 *         description: Factura no encontrada
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.patch("/:id/estado", authenticate, authorizeAdmin, updateEstadoFactura);

module.exports = router;
