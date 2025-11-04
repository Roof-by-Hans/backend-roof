const express = require("express");
const router = express.Router();
const {
  abrirCajaDiaria,
  cerrarCajaDiaria,
  obtenerCajaActual,
  obtenerHistorialCajas,
  obtenerDetalleCaja,
  obtenerMovimientosCaja,
  obtenerAuditoriaCaja,
} = require("../controllers/cajaDiariaController");
const {
  authenticate,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: CajaDiaria
 *   description: Operaciones relacionadas con la gestión de la caja diaria
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CajaDiaria:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único de la caja diaria
 *           example: 7
 *         fecha:
 *           type: string
 *           format: date
 *           description: Fecha de la caja diaria
 *           example: "2025-10-28"
 *         fechaApertura:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Fecha y hora de apertura de la caja
 *           example: "2025-10-28T09:00:00.000Z"
 *         fechaCierre:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Fecha y hora de cierre de la caja
 *           example: "2025-10-28T23:45:00.000Z"
 *         montoInicial:
 *           type: number
 *           description: Monto inicial con el que se abrió la caja
 *           example: 5000
 *         montoFinal:
 *           type: number
 *           nullable: true
 *           description: Monto final registrado al cierre de la caja
 *           example: 12500.5
 *         estado:
 *           type: string
 *           description: Estado actual de la caja diaria
 *           example: "CERRADA"
 *         creadoPor:
 *           type: integer
 *           nullable: true
 *           description: Usuario que abrió la caja
 *           example: 3
 *         cerradoPor:
 *           type: integer
 *           nullable: true
 *           description: Usuario que cerró la caja
 *           example: 8
 */

/**
 * @swagger
 * /api/caja-diaria/abrir:
 *   post:
 *     summary: Abrir una nueva caja diaria
 *     description: Crea una caja diaria para la fecha actual si no existe otra caja abierta.
 *     tags: [CajaDiaria]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               monto_inicial:
 *                 type: number
 *                 description: Monto inicial con el que se abre la caja diaria. Si no se envía, se toma 0.
 *                 example: 1500.50
 *     responses:
 *       201:
 *         description: Caja diaria abierta correctamente
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
 *                   example: "Caja diaria abierta correctamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 5
 *                     fecha:
 *                       type: string
 *                       format: date
 *                       example: "2025-10-27"
 *                     fechaApertura:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-10-27T09:00:00.000Z"
 *                     fechaCierre:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: null
 *                     montoInicial:
 *                       type: number
 *                       example: 1500.5
 *                     montoFinal:
 *                       type: number
 *                       nullable: true
 *                       example: null
 *                     estado:
 *                       type: string
 *                       example: "ABIERTA"
 *                     creadoPor:
 *                       type: integer
 *                       example: 1
 *                     cerradoPor:
 *                       type: integer
 *                       nullable: true
 *                       example: null
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Falta autenticación
 *       403:
 *         description: Falta de permisos
 *       409:
 *         description: Ya existe una caja abierta o registrada para la fecha
 *       500:
 *         description: Error interno del servidor
 */
router.post("/abrir", authenticate, authorizeAdmin, abrirCajaDiaria);

/**
 * @swagger
 * /api/caja-diaria/cerrar:
 *   post:
 *     summary: Cerrar la caja diaria abierta
 *     description: Cierra la caja diaria actual calculando los movimientos del día, registrando auditoría y generando un ajuste si existe diferencia.
 *     tags: [CajaDiaria]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - montoFinalReportado
 *             properties:
 *               montoFinalReportado:
 *                 type: number
 *                 description: Monto final contado al cierre de la caja.
 *                 example: 12500.5
 *               observacion:
 *                 type: string
 *                 description: Comentarios adicionales sobre el cierre.
 *                 example: "Cierre sin diferencias"
 *               conteoEfectivo:
 *                 type: number
 *                 description: Total en efectivo contado al cierre.
 *                 example: 8000
 *               conteoTarjetas:
 *                 type: number
 *                 description: Total correspondiente a cobros con tarjeta.
 *                 example: 4500.5
 *               subtotalesPorMedio:
 *                 type: array
 *                 description: Detalle de montos por medio de pago.
 *                 items:
 *                   type: object
 *                   required:
 *                     - idMedioPago
 *                     - monto
 *                   properties:
 *                     idMedioPago:
 *                       type: integer
 *                       example: 1
 *                     monto:
 *                       type: number
 *                       example: 8000
 *     responses:
 *       200:
 *         description: Caja diaria cerrada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     caja:
 *                       $ref: '#/components/schemas/CajaDiaria'
 *                     auditoria:
 *                       type: object
 *                       properties:
 *                         montoInicial:
 *                           type: number
 *                         totalDia:
 *                           type: number
 *                         montoCalculado:
 *                           type: number
 *                         montoFinal:
 *                           type: number
 *                         diferencia:
 *                           type: number
 *                         observacion:
 *                           type: string
 *                     totalesMovimientos:
 *                       type: object
 *                       properties:
 *                         ingresos:
 *                           type: number
 *                         egresos:
 *                           type: number
 *                         ajustes:
 *                           type: number
 *                     ajusteGenerado:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         idMovimiento:
 *                           type: integer
 *                         monto:
 *                           type: number
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Falta autenticación
 *       403:
 *         description: Falta de permisos
 *       409:
 *         description: No hay caja abierta para cerrar
 *       500:
 *         description: Error interno del servidor
 */
router.post("/cerrar", authenticate, authorizeAdmin, cerrarCajaDiaria);

/**
 * @swagger
 * /api/caja-diaria/actual:
 *   get:
 *     summary: Obtener la caja diaria actual
 *     description: Devuelve la caja del día actual (si existe), incluyendo totales en tiempo real si está abierta.
 *     tags: [CajaDiaria]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Caja actual obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: integer
 *                     fecha:
 *                       type: string
 *                       format: date
 *                     fechaApertura:
 *                       type: string
 *                       format: date-time
 *                     fechaCierre:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     montoInicial:
 *                       type: number
 *                     montoFinal:
 *                       type: number
 *                       nullable: true
 *                     estado:
 *                       type: string
 *                     creadoPor:
 *                       type: integer
 *                     cerradoPor:
 *                       type: integer
 *                       nullable: true
 *                     totales:
 *                       type: object
 *                       description: Presente solo si la caja está abierta
 *                       properties:
 *                         ingresos:
 *                           type: number
 *                         egresos:
 *                           type: number
 *                         ajustes:
 *                           type: number
 *                         totalDia:
 *                           type: number
 *                         montoEsperado:
 *                           type: number
 *                         cantidadMovimientos:
 *                           type: integer
 *       401:
 *         description: Falta autenticación
 *       403:
 *         description: Falta de permisos
 *       500:
 *         description: Error interno del servidor
 */
router.get("/actual", authenticate, authorizeAdmin, obtenerCajaActual);

/**
 * @swagger
 * /api/caja-diaria/historial:
 *   get:
 *     summary: Obtener historial de cajas diarias
 *     description: Lista todas las cajas diarias con paginación y filtros opcionales.
 *     tags: [CajaDiaria]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Cantidad de registros por página
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [ABIERTA, CERRADA]
 *         description: Filtrar por estado de la caja
 *       - in: query
 *         name: fechaDesde
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha mínima (formato YYYY-MM-DD)
 *       - in: query
 *         name: fechaHasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha máxima (formato YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Historial obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CajaDiaria'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Falta autenticación
 *       403:
 *         description: Falta de permisos
 *       500:
 *         description: Error interno del servidor
 */
router.get("/historial", authenticate, authorizeAdmin, obtenerHistorialCajas);

/**
 * @swagger
 * /api/caja-diaria/{id}:
 *   get:
 *     summary: Obtener detalle de una caja específica
 *     description: Devuelve información completa de una caja diaria, incluyendo totales de movimientos.
 *     tags: [CajaDiaria]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la caja diaria
 *     responses:
 *       200:
 *         description: Detalle obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     fecha:
 *                       type: string
 *                       format: date
 *                     fechaApertura:
 *                       type: string
 *                       format: date-time
 *                     fechaCierre:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     montoInicial:
 *                       type: number
 *                     montoFinal:
 *                       type: number
 *                     estado:
 *                       type: string
 *                     creadoPor:
 *                       type: integer
 *                     cerradoPor:
 *                       type: integer
 *                       nullable: true
 *                     totales:
 *                       type: object
 *                       properties:
 *                         ingresos:
 *                           type: number
 *                         egresos:
 *                           type: number
 *                         ajustes:
 *                           type: number
 *                         totalDia:
 *                           type: number
 *                         cantidadMovimientos:
 *                           type: integer
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Falta autenticación
 *       403:
 *         description: Falta de permisos
 *       404:
 *         description: Caja no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get("/:id", authenticate, authorizeAdmin, obtenerDetalleCaja);

/**
 * @swagger
 * /api/caja-diaria/{id}/movimientos:
 *   get:
 *     summary: Obtener movimientos de una caja específica
 *     description: Lista todos los movimientos de caja ordenados cronológicamente.
 *     tags: [CajaDiaria]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la caja diaria
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [INGRESO, EGRESO, AJUSTE, APERTURA, CIERRE, DEVOLUCION]
 *         description: Filtrar por tipo de movimiento
 *     responses:
 *       200:
 *         description: Movimientos obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       idCaja:
 *                         type: integer
 *                       idCliente:
 *                         type: integer
 *                         nullable: true
 *                       tipo:
 *                         type: string
 *                       idMedioPago:
 *                         type: integer
 *                         nullable: true
 *                       monto:
 *                         type: number
 *                       concepto:
 *                         type: string
 *                         nullable: true
 *                       idUsuario:
 *                         type: integer
 *                         nullable: true
 *                       idMovimientoCuenta:
 *                         type: integer
 *                         nullable: true
 *                       fecha:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Falta autenticación
 *       403:
 *         description: Falta de permisos
 *       404:
 *         description: Caja no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/:id/movimientos",
  authenticate,
  authorizeAdmin,
  obtenerMovimientosCaja
);

/**
 * @swagger
 * /api/caja-diaria/{id}/auditoria:
 *   get:
 *     summary: Obtener auditoría de cierre de una caja
 *     description: Devuelve el registro de auditoría generado al cerrar la caja.
 *     tags: [CajaDiaria]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la caja diaria
 *     responses:
 *       200:
 *         description: Auditoría obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     idCaja:
 *                       type: integer
 *                     fecha:
 *                       type: string
 *                       format: date-time
 *                     montoInicial:
 *                       type: number
 *                     totalDia:
 *                       type: number
 *                     montoCalculado:
 *                       type: number
 *                     montoFinal:
 *                       type: number
 *                     diferencia:
 *                       type: number
 *                     idUsuario:
 *                       type: integer
 *                     observacion:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Falta autenticación
 *       403:
 *         description: Falta de permisos
 *       404:
 *         description: Caja no encontrada o sin auditoría
 *       409:
 *         description: La caja no ha sido cerrada
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/:id/auditoria",
  authenticate,
  authorizeAdmin,
  obtenerAuditoriaCaja
);

module.exports = router;
