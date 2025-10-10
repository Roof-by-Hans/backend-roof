const express = require("express");
const router = express.Router();
const {
  getMovimientosCuenta,
  getMovimientoCuentaPorId,
  getMovimientosPorCliente,
  getResumenCuentaCliente,
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
 *         idFactura:
 *           type: integer
 *           nullable: true
 *           description: ID de la factura asociada (si aplica)
 *           example: 10
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
 *                   type: object
 *                   properties:
 *                     cliente:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 5
 *                         nombre:
 *                           type: string
 *                           example: "Juan"
 *                         apellido:
 *                           type: string
 *                           example: "Pérez"
 *                         email:
 *                           type: string
 *                           example: "juan.perez@email.com"
 *                         saldoActual:
 *                           type: number
 *                           format: float
 *                           example: 500.00
 *                         tarjetaUuid:
 *                           type: string
 *                           nullable: true
 *                           example: "abc123-def456"
 *                     totalesPorTipo:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tipo:
 *                             type: string
 *                             example: "CONSUMO"
 *                           cantidad:
 *                             type: integer
 *                             example: 15
 *                           total:
 *                             type: number
 *                             format: float
 *                             example: 1250.50
 *                     ultimosMovimientos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MovimientoCuenta'
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

module.exports = router;
