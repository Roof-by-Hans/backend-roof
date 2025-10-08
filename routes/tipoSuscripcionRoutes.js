const express = require("express");
const router = express.Router();
const {
  getTiposSuscripcion,
  getTipoSuscripcionPorId,
} = require("../controllers/tipoSuscripcionController");
const {
  authenticate,
} = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: TipoSuscripcion
 *   description: Endpoints para gestionar tipos de suscripción (PREPAGA o CREDITO)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     TipoSuscripcion:
 *       type: object
 *       required:
 *         - id
 *         - nombre
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único del tipo de suscripción
 *           example: 1
 *         nombre:
 *           type: string
 *           enum: ['PREPAGA', 'CREDITO']
 *           description: Tipo de suscripción - PREPAGA (tarjeta prepaga) o CREDITO (tarjeta de crédito)
 *           example: "PREPAGA"
 */

/**
 * @swagger
 * /api/tipos-suscripcion:
 *   get:
 *     summary: Obtener todos los tipos de suscripción
 *     description: Retorna la lista de todos los tipos de suscripción disponibles
 *     tags: [TipoSuscripcion]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tipos de suscripción obtenida exitosamente
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
 *                     $ref: '#/components/schemas/TipoSuscripcion'
 *                 message:
 *                   type: string
 *                   example: "Tipos de suscripción obtenidos exitosamente"
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", authenticate, getTiposSuscripcion);

/**
 * @swagger
 * /api/tipos-suscripcion/{id}:
 *   get:
 *     summary: Obtener un tipo de suscripción por ID
 *     description: Retorna un tipo de suscripción específico por su ID
 *     tags: [TipoSuscripcion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tipo de suscripción
 *         example: 1
 *     responses:
 *       200:
 *         description: Tipo de suscripción encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TipoSuscripcion'
 *                 message:
 *                   type: string
 *                   example: "Tipo de suscripción obtenido exitosamente"
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Tipo de suscripción no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/:id", authenticate, getTipoSuscripcionPorId);

module.exports = router;
