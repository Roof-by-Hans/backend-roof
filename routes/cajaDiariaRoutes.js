const express = require("express");
const router = express.Router();
const {
  abrirCajaDiaria,
  cerrarCajaDiaria,
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

module.exports = router;
