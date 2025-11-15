const express = require("express");
const router = express.Router();
const {
  getMovimientosCuenta,
  getMovimientoCuentaPorId,
  getMovimientosPorCliente,
  getResumenCuentaCliente,
  getMovimientosPorTarjeta,
  getMovimientosPorTipo,
} = require("../controllers/movimientoCuentaController");
const {
  authenticate,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Movimientos de Cuenta
 *   description: Endpoints para gestionar movimientos de cuenta de clientes
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     TipoMovimiento:
 *       type: object
 *       required:
 *         - id
 *         - nombre
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único del tipo de movimiento
 *           example: 1
 *         nombre:
 *           type: string
 *           description: Nombre del tipo de movimiento
 *           example: "Recarga Efectivo"
 *     Tarjeta:
 *       type: object
 *       required:
 *         - id
 *         - uuid
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único de la tarjeta
 *           example: 3
 *         uuid:
 *           type: string
 *           description: UUID único de la tarjeta
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         saldoActual:
 *           type: number
 *           format: float
 *           description: Saldo actual de la tarjeta
 *           example: 1250.75
 *     Usuario:
 *       type: object
 *       required:
 *         - id
 *         - nombreUsuario
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único del usuario
 *           example: 2
 *         nombreUsuario:
 *           type: string
 *           description: Nombre del usuario
 *           example: "admin"
 *     ResumenCuenta:
 *       type: object
 *       required:
 *         - cliente
 *         - totalesPorTipo
 *         - ultimosMovimientos
 *       properties:
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
 *             saldoActual:
 *               type: number
 *               format: float
 *               example: 1250.75
 *             tarjetaUuid:
 *               type: string
 *               nullable: true
 *               example: "550e8400-e29b-41d4-a716-446655440000"
 *         totalesPorTipo:
 *           type: array
 *           description: Totales agrupados por tipo de movimiento
 *           items:
 *             type: object
 *             properties:
 *               tipo:
 *                 type: string
 *                 example: "CONSUMO"
 *               cantidad:
 *                 type: integer
 *                 example: 15
 *               total:
 *                 type: number
 *                 format: float
 *                 example: 245000.00
 *         ultimosMovimientos:
 *           type: array
 *           description: Últimos 10 movimientos del cliente
 *           items:
 *             $ref: '#/components/schemas/MovimientoCuenta'
 *     MovimientoCuenta:
 *       type: object
 *       required:
 *         - id
 *         - idCliente
 *         - fecha
 *         - monto
 *         - tipoMovimiento
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único del movimiento
 *           example: 1
 *         idCliente:
 *           type: integer
 *           description: ID del cliente asociado
 *           example: 5
 *         idTarjeta:
 *           type: integer
 *           nullable: true
 *           description: ID de la tarjeta asociada
 *           example: 3
 *         fecha:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora del movimiento
 *           example: "2025-10-10T14:30:00.000Z"
 *         monto:
 *           type: number
 *           format: float
 *           description: Monto del movimiento
 *           example: 150.50
 *         tipoMovimiento:
 *           type: string
 *           enum: [CONSUMO, RECARGA, PAGO]
 *           description: Tipo de movimiento realizado
 *           example: CONSUMO
 *         idTipoMov:
 *           type: integer
 *           nullable: true
 *           description: ID del tipo de movimiento detallado
 *           example: 1
 *         idFactura:
 *           type: integer
 *           nullable: true
 *           description: ID de la factura asociada (si aplica)
 *           example: 10
 *         idMovCaja:
 *           type: integer
 *           nullable: true
 *           description: ID del movimiento de caja asociado
 *           example: 25
 *         idUsuario:
 *           type: integer
 *           nullable: true
 *           description: ID del usuario que registró el movimiento
 *           example: 2
 *         observaciones:
 *           type: string
 *           nullable: true
 *           description: Observaciones adicionales del movimiento
 *           example: "Consumo en mesa 5"
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
 *         tarjeta:
 *           type: object
 *           nullable: true
 *           description: Información de la tarjeta asociada
 *           properties:
 *             id:
 *               type: integer
 *               example: 3
 *             uuid:
 *               type: string
 *               example: "550e8400-e29b-41d4-a716-446655440000"
 *             saldoActual:
 *               type: number
 *               format: float
 *               example: 1250.75
 *         tipoMovimientoDetalle:
 *           type: object
 *           nullable: true
 *           description: Detalle del tipo de movimiento
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *             nombre:
 *               type: string
 *               example: "Recarga Efectivo"
 *         factura:
 *           type: object
 *           nullable: true
 *           description: Información de la factura asociada
 *           properties:
 *             id:
 *               type: integer
 *               example: 10
 *             total:
 *               type: number
 *               format: float
 *               example: 150.50
 *             estado:
 *               type: string
 *               enum: [PENDIENTE, COBRADA, ANULADA]
 *               example: COBRADA
 *         usuario:
 *           type: object
 *           nullable: true
 *           description: Información del usuario que registró el movimiento
 *           properties:
 *             id:
 *               type: integer
 *               example: 2
 *             nombreUsuario:
 *               type: string
 *               example: "admin"
 */

/**
 * @swagger
 * /api/movimientos-cuenta:
 *   get:
 *     summary: Obtener todos los movimientos de cuenta
 *     tags: [Movimientos de Cuenta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de movimientos de cuenta obtenida correctamente
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
 *                     $ref: '#/components/schemas/MovimientoCuenta'
 *                 message:
 *                   type: string
 *                   example: "Movimientos de cuenta obtenidos correctamente"
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", authenticate, authorizeAdmin, getMovimientosCuenta);

/**
 * @swagger
 * /api/movimientos-cuenta/cliente/{idCliente}/resumen:
 *   get:
 *     summary: Obtener resumen de cuenta de un cliente
 *     description: Devuelve el saldo actual, totales por tipo de movimiento y últimos 10 movimientos
 *     tags: [Movimientos de Cuenta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idCliente
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Resumen de cuenta obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ResumenCuenta'
 *                 message:
 *                   type: string
 *                   example: "Resumen de cuenta obtenido correctamente"
 *       404:
 *         description: Cliente no encontrado
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/cliente/:idCliente/resumen",
  authenticate,
  authorizeAdmin,
  getResumenCuentaCliente
);

/**
 * @swagger
 * /api/movimientos-cuenta/cliente/{idCliente}:
 *   get:
 *     summary: Obtener movimientos de cuenta de un cliente específico
 *     tags: [Movimientos de Cuenta]
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
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [CONSUMO, RECARGA, PAGO]
 *         description: Filtrar por tipo de movimiento
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
 *         description: Movimientos del cliente obtenidos correctamente
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
 *                     $ref: '#/components/schemas/MovimientoCuenta'
 *                 message:
 *                   type: string
 *                   example: "Movimientos de cuenta del cliente obtenidos correctamente"
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/cliente/:idCliente",
  authenticate,
  authorizeAdmin,
  getMovimientosPorCliente
);

/**
 * @swagger
 * /api/movimientos-cuenta/{id}:
 *   get:
 *     summary: Obtener un movimiento de cuenta por ID
 *     tags: [Movimientos de Cuenta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del movimiento de cuenta
 *     responses:
 *       200:
 *         description: Movimiento de cuenta obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/MovimientoCuenta'
 *                 message:
 *                   type: string
 *                   example: "Movimiento de cuenta obtenido correctamente"
 *       404:
 *         description: Movimiento no encontrado
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/:id", authenticate, authorizeAdmin, getMovimientoCuentaPorId);

/**
 * @swagger
 * /api/movimientos-cuenta/tarjeta/{idTarjeta}:
 *   get:
 *     summary: Obtener movimientos de cuenta por tarjeta
 *     tags: [Movimientos de Cuenta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idTarjeta
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la tarjeta
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [CONSUMO, RECARGA, PAGO]
 *         description: Filtrar por tipo de movimiento
 *       - in: query
 *         name: desde
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha desde (YYYY-MM-DD)
 *       - in: query
 *         name: hasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha hasta (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Movimientos de cuenta obtenidos correctamente
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
 *                     $ref: '#/components/schemas/MovimientoCuenta'
 *                 message:
 *                   type: string
 *                   example: "Movimientos de cuenta de la tarjeta obtenidos correctamente"
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/tarjeta/:idTarjeta",
  authenticate,
  authorizeAdmin,
  getMovimientosPorTarjeta
);

/**
 * @swagger
 * /api/movimientos-cuenta/tipo/{idTipoMov}:
 *   get:
 *     summary: Obtener movimientos de cuenta por tipo de movimiento
 *     tags: [Movimientos de Cuenta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idTipoMov
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tipo de movimiento
 *       - in: query
 *         name: desde
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha desde (YYYY-MM-DD)
 *       - in: query
 *         name: hasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha hasta (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Movimientos de cuenta obtenidos correctamente
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
 *                     $ref: '#/components/schemas/MovimientoCuenta'
 *                 message:
 *                   type: string
 *                   example: "Movimientos de cuenta por tipo obtenidos correctamente"
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/tipo/:idTipoMov",
  authenticate,
  authorizeAdmin,
  getMovimientosPorTipo
);

module.exports = router;
