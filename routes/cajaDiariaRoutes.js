const express = require("express");
const router = express.Router();
const { abrirCajaDiaria } = require("../controllers/cajaDiariaController");
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

module.exports = router;
