const express = require("express");
const router = express.Router();
const {
  registrarConsumo,
  registrarRecarga,
  registrarPago,
} = require("../controllers/transaccionController");
const {
  authenticate,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Transacciones
 *   description: Endpoints para gestionar transacciones (consumos, recargas y pagos)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ProductoConsumo:
 *       type: object
 *       required:
 *         - idProducto
 *         - cantidad
 *       properties:
 *         idProducto:
 *           type: integer
 *           description: ID del producto a consumir
 *           example: 1
 *         cantidad:
 *           type: integer
 *           description: Cantidad de unidades
 *           minimum: 1
 *           example: 2
 *         precioUnitario:
 *           type: number
 *           format: float
 *           description: Precio unitario (opcional, si no se envía se usa el del producto)
 *           example: 5000.00
 *     TransaccionConsumo:
 *       type: object
 *       required:
 *         - idCliente
 *         - productos
 *       properties:
 *         idCliente:
 *           type: integer
 *           description: ID del cliente que realiza el consumo
 *           example: 1
 *         idMesa:
 *           type: integer
 *           description: ID de la mesa donde se realiza el consumo (opcional, no puede enviarse junto con idGrupo)
 *           example: 5
 *         idGrupo:
 *           type: integer
 *           description: ID del grupo de mesas donde se realiza el consumo (opcional, no puede enviarse junto con idMesa)
 *           example: 2
 *         productos:
 *           type: array
 *           description: Lista de productos consumidos
 *           minItems: 1
 *           items:
 *             $ref: '#/components/schemas/ProductoConsumo'
 *         observaciones:
 *           type: string
 *           description: Observaciones adicionales sobre el consumo
 *           example: "Cliente prefiere sin cebolla"
 *     TransaccionRecarga:
 *       type: object
 *       required:
 *         - idCliente
 *         - monto
 *         - metodoPago
 *       properties:
 *         idCliente:
 *           type: integer
 *           description: ID del cliente que realiza la recarga
 *           example: 1
 *         monto:
 *           type: number
 *           format: float
 *           description: Monto a recargar
 *           minimum: 0.01
 *           example: 50000.00
 *         metodoPago:
 *           type: string
 *           description: Método de pago utilizado
 *           enum: [Efectivo, Tarjeta de Débito, Tarjeta de Crédito, Transferencia]
 *           example: "Efectivo"
 *         observaciones:
 *           type: string
 *           description: Observaciones adicionales
 *           example: "Recarga en efectivo"
 *     TransaccionPago:
 *       type: object
 *       required:
 *         - idCliente
 *         - monto
 *         - metodoPago
 *       properties:
 *         idCliente:
 *           type: integer
 *           description: ID del cliente que realiza el pago
 *           example: 1
 *         monto:
 *           type: number
 *           format: float
 *           description: Monto del pago
 *           minimum: 0.01
 *           example: 15000.00
 *         metodoPago:
 *           type: string
 *           description: Método de pago utilizado
 *           enum: [Efectivo, Tarjeta de Débito, Tarjeta de Crédito, Transferencia]
 *           example: "Tarjeta de Crédito"
 *         idFactura:
 *           type: integer
 *           description: ID de la factura a pagar (opcional)
 *           example: 10
 *         observaciones:
 *           type: string
 *           description: Observaciones adicionales
 *           example: "Pago parcial de factura"
 */

/**
 * @swagger
 * /api/transacciones/consumo:
 *   post:
 *     summary: Registrar consumo de productos y generar factura automáticamente
 *     description: |
 *       Crea una factura con los productos consumidos, registra el movimiento de cuenta y actualiza el saldo de la tarjeta del cliente.
 *       
 *       **Comportamiento según tipo de tarjeta:**
 *       - **PREPAGA**: Descuenta del saldo disponible. La factura se marca como COBRADA automáticamente.
 *       - **CRÉDITO**: Aumenta la deuda (saldo_actual += monto). La factura queda PENDIENTE hasta que se pague.
 *       
 *       **Validaciones:**
 *       - PREPAGA: No permite consumo si saldo < total
 *       - CRÉDITO: No permite consumo si deuda_actual + total > limite_credito
 *       - No se puede especificar idMesa e idGrupo al mismo tiempo
 *       
 *       **Registro en base de datos:**
 *       - Se crea la Factura con los productos (estado COBRADA o PENDIENTE)
 *       - Se registra MovimientoCuenta con tipo CONSUMO (id_tipo_mov referencia a TipoMovimiento)
 *       - Se actualiza el saldo de la Tarjeta según el tipo
 *       - NO se registra en MovimientoCaja (el dinero ya fue pagado en PREPAGA o se pagará después en CRÉDITO)
 *     tags: [Transacciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransaccionConsumo'
 *           examples:
 *             consumoEnMesa:
 *               summary: Consumo en mesa individual
 *               value:
 *                 idCliente: 1
 *                 idMesa: 5
 *                 productos:
 *                   - idProducto: 1
 *                     cantidad: 2
 *                   - idProducto: 2
 *                     cantidad: 1
 *                     precioUnitario: 3500.00
 *                 observaciones: "Sin cebolla en la hamburguesa"
 *             consumoEnGrupo:
 *               summary: Consumo en grupo de mesas
 *               value:
 *                 idCliente: 2
 *                 idGrupo: 1
 *                 productos:
 *                   - idProducto: 1
 *                     cantidad: 5
 *     responses:
 *       201:
 *         description: Consumo registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Consumo registrado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     factura:
 *                       $ref: '#/components/schemas/Factura'
 *                     resumen:
 *                       type: object
 *                       properties:
 *                         totalConsumo:
 *                           type: number
 *                           format: float
 *                           example: 13000.00
 *                         cantidadProductos:
 *                           type: integer
 *                           example: 3
 *                         tipoTarjeta:
 *                           type: string
 *                           enum: [PREPAGA, CREDITO]
 *                           example: "PREPAGA"
 *                         saldoAnterior:
 *                           type: number
 *                           format: float
 *                           example: 50000.00
 *                           description: Para PREPAGA es saldo disponible, para CRÉDITO es deuda acumulada
 *                         saldoActual:
 *                           type: number
 *                           format: float
 *                           example: 37000.00
 *                           description: Para PREPAGA es saldo disponible, para CRÉDITO es deuda acumulada
 *       400:
 *         description: Datos inválidos, saldo insuficiente o límite de crédito excedido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Saldo insuficiente para realizar el consumo"
 *                 detalles:
 *                   type: object
 *                   properties:
 *                     saldoActual:
 *                       type: number
 *                       example: 5000.00
 *                       description: Saldo disponible (PREPAGA) o deuda actual (CRÉDITO)
 *                     totalConsumo:
 *                       type: number
 *                       example: 13000.00
 *                     faltante:
 *                       type: number
 *                       example: 8000.00
 *                       description: Solo para PREPAGA
 *                     deudaActual:
 *                       type: number
 *                       example: 30000.00
 *                       description: Solo para CRÉDITO
 *                     limiteCredito:
 *                       type: number
 *                       example: 100000.00
 *                       description: Solo para CRÉDITO
 *                     creditoDisponible:
 *                       type: number
 *                       example: 70000.00
 *                       description: Solo para CRÉDITO
 *                     nuevaDeuda:
 *                       type: number
 *                       example: 43000.00
 *                       description: Solo para CRÉDITO - Deuda que tendría después del consumo
 *             examples:
 *               saldoInsuficiente:
 *                 summary: Error PREPAGA - Saldo insuficiente
 *                 value:
 *                   success: false
 *                   message: "Saldo insuficiente para realizar el consumo"
 *                   detalles:
 *                     saldoActual: 5000.00
 *                     totalConsumo: 13000.00
 *                     faltante: 8000.00
 *               limiteExcedido:
 *                 summary: Error CRÉDITO - Límite excedido
 *                 value:
 *                   success: false
 *                   message: "El consumo excede el límite de crédito disponible"
 *                   detalles:
 *                     deudaActual: 95000.00
 *                     limiteCredito: 100000.00
 *                     creditoDisponible: 5000.00
 *                     totalConsumo: 10000.00
 *                     nuevaDeuda: 105000.00
 *               mesaYGrupo:
 *                 summary: Error - No se puede enviar mesa y grupo juntos
 *                 value:
 *                   success: false
 *                   message: "No puede especificar tanto mesa individual como grupo de mesas"
 *       404:
 *         description: Cliente, producto, mesa o grupo no encontrado
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.post("/consumo", authenticate, authorizeAdmin, registrarConsumo);

/**
 * @swagger
 * /api/transacciones/recarga:
 *   post:
 *     summary: Registrar recarga de tarjeta prepaga
 *     description: |
 *       Permite recargar saldo en tarjetas de tipo PREPAGA. Las tarjetas de tipo CRÉDITO no pueden recargarse.
 *       
 *       **Proceso:**
 *       - Se valida que la tarjeta sea PREPAGA
 *       - Se registra MovimientoCuenta con tipo RECARGA (id_tipo_mov referencia a TipoMovimiento)
 *       - Se suma el monto al saldo de la tarjeta: `saldo_actual += monto`
 *       - Si hay caja abierta del día, se registra INGRESO en MovimientoCaja
 *       - Se vincula el MovimientoCaja con el MovimientoCuenta mediante id_movimiento_cuenta
 *       - Se registra el medio de pago usado
 *       
 *       **Nota:** La recarga se registra en caja solo si hay una caja abierta en la fecha actual.
 *     tags: [Transacciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransaccionRecarga'
 *           example:
 *             idCliente: 1
 *             monto: 50000.00
 *             metodoPago: "Efectivo"
 *             observaciones: "Recarga en efectivo"
 *     responses:
 *       201:
 *         description: Recarga realizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Recarga realizada exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     cliente:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         nombre:
 *                           type: string
 *                           example: "Juan Pérez"
 *                     recarga:
 *                       type: object
 *                       properties:
 *                         monto:
 *                           type: number
 *                           format: float
 *                           example: 50000.00
 *                         metodoPago:
 *                           type: string
 *                           example: "Efectivo"
 *                         fecha:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-11-12T14:30:00.000Z"
 *                     saldos:
 *                       type: object
 *                       properties:
 *                         anterior:
 *                           type: number
 *                           format: float
 *                           example: 10000.00
 *                         recargado:
 *                           type: number
 *                           format: float
 *                           example: 50000.00
 *                         actual:
 *                           type: number
 *                           format: float
 *                           example: 60000.00
 *                     movimientoCajaRegistrado:
 *                       type: boolean
 *                       example: true
 *                       description: Indica si se registró el ingreso en MovimientoCaja (solo si hay caja abierta)
 *       400:
 *         description: Datos inválidos o tipo de tarjeta no válido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Solo se pueden recargar tarjetas de tipo PREPAGA"
 *                 tipoActual:
 *                   type: string
 *                   example: "CREDITO"
 *       404:
 *         description: Cliente no encontrado
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.post("/recarga", authenticate, authorizeAdmin, registrarRecarga);

/**
 * @swagger
 * /api/transacciones/pago:
 *   post:
 *     summary: Registrar pago de factura o reducción de deuda
 *     description: |
 *       Permite registrar pagos para liquidar deudas de tarjetas CRÉDITO o pagar facturas específicas.
 *       
 *       **Proceso:**
 *       - Se registra MovimientoCuenta con tipo PAGO (id_tipo_mov referencia a TipoMovimiento)
 *       - Se reduce la deuda de la tarjeta: `saldo_actual -= monto`
 *       - Si se especifica idFactura y el pago es >= total de la factura, se actualiza estado a COBRADA
 *       - Si hay caja abierta del día, se registra INGRESO en MovimientoCaja
 *       - Se vincula el MovimientoCaja con el MovimientoCuenta mediante id_movimiento_cuenta
 *       - Se registra el medio de pago usado
 *       
 *       **Uso típico:**
 *       - Para tarjetas CRÉDITO: Pagar deuda acumulada
 *       - Puede vincular a una factura específica o ser un pago general
 *       
 *       **Nota:** El pago se registra en caja solo si hay una caja abierta en la fecha actual.
 *     tags: [Transacciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransaccionPago'
 *           examples:
 *             pagoConFactura:
 *               summary: Pago de factura específica
 *               value:
 *                 idCliente: 1
 *                 monto: 15000.00
 *                 metodoPago: "Tarjeta de Crédito"
 *                 idFactura: 10
 *                 observaciones: "Pago de factura #10"
 *             pagoSinFactura:
 *               summary: Pago general de deuda
 *               value:
 *                 idCliente: 1
 *                 monto: 20000.00
 *                 metodoPago: "Transferencia"
 *                 observaciones: "Pago parcial de deuda"
 *     responses:
 *       201:
 *         description: Pago registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Pago registrado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     cliente:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         nombre:
 *                           type: string
 *                           example: "Juan Pérez"
 *                         tipoTarjeta:
 *                           type: string
 *                           enum: [PREPAGA, CREDITO]
 *                           example: "CREDITO"
 *                     pago:
 *                       type: object
 *                       properties:
 *                         monto:
 *                           type: number
 *                           format: float
 *                           example: 15000.00
 *                         metodoPago:
 *                           type: string
 *                           example: "Tarjeta de Crédito"
 *                         fecha:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-11-12T14:30:00.000Z"
 *                     saldos:
 *                       type: object
 *                       properties:
 *                         deudaAnterior:
 *                           type: number
 *                           format: float
 *                           example: 50000.00
 *                           description: Deuda acumulada antes del pago (saldo_actual)
 *                         montoPagado:
 *                           type: number
 *                           format: float
 *                           example: 15000.00
 *                         deudaActual:
 *                           type: number
 *                           format: float
 *                           example: 35000.00
 *                           description: Deuda después del pago (saldo_actual)
 *                     movimientoCajaRegistrado:
 *                       type: boolean
 *                       example: true
 *                       description: Indica si se registró el ingreso en MovimientoCaja (solo si hay caja abierta)
 *                     factura:
 *                       type: object
 *                       description: Información de la factura (solo si se especificó idFactura)
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: number
 *                           format: float
 *                           example: 15000.00
 *                         estadoAnterior:
 *                           type: string
 *                           enum: [PENDIENTE, COBRADA, ANULADA]
 *                           example: "PENDIENTE"
 *                         estadoActual:
 *                           type: string
 *                           enum: [PENDIENTE, COBRADA, ANULADA]
 *                           example: "COBRADA"
 *       400:
 *         description: Datos inválidos o factura ya cobrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "La factura ya está cobrada"
 *       404:
 *         description: Cliente o factura no encontrada
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error interno del servidor
 */
router.post("/pago", authenticate, authorizeAdmin, registrarPago);

module.exports = router;
