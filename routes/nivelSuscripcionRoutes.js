const express = require("express");
const router = express.Router();
const {
  getNivelesSuscripcion,
  getNivelSuscripcionPorId,
  crearNivelSuscripcion,
  actualizarNivelSuscripcion,
  eliminarNivelSuscripcion,
} = require("../controllers/nivelSuscripcionController");
const {
  authenticate,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: NivelSuscripcion
 *   description: Endpoints para gestionar niveles de suscripción (Black, Gold, Platinum, etc.)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     NivelSuscripcion:
 *       type: object
 *       required:
 *         - id
 *         - nombre
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único del nivel de suscripción
 *           example: 1
 *         nombre:
 *           type: string
 *           description: Nombre del nivel de suscripción
 *           example: "Black"
 */

/**
 * @swagger
 * /api/niveles-suscripcion:
 *   get:
 *     summary: Obtener todos los niveles de suscripción
 *     description: Retorna la lista de todos los niveles de suscripción disponibles
 *     tags: [NivelSuscripcion]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de niveles de suscripción obtenida exitosamente
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
 *                     $ref: '#/components/schemas/NivelSuscripcion'
 *                 message:
 *                   type: string
 *                   example: "Niveles de suscripción obtenidos exitosamente"
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", authenticate, getNivelesSuscripcion);

/**
 * @swagger
 * /api/niveles-suscripcion/{id}:
 *   get:
 *     summary: Obtener un nivel de suscripción por ID
 *     description: Retorna un nivel de suscripción específico por su ID
 *     tags: [NivelSuscripcion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del nivel de suscripción
 *         example: 1
 *     responses:
 *       200:
 *         description: Nivel de suscripción encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/NivelSuscripcion'
 *                 message:
 *                   type: string
 *                   example: "Nivel de suscripción obtenido exitosamente"
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Nivel de suscripción no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/:id", authenticate, getNivelSuscripcionPorId);

/**
 * @swagger
 * /api/niveles-suscripcion:
 *   post:
 *     summary: Crear un nuevo nivel de suscripción
 *     description: Crea un nuevo nivel de suscripción en el sistema (ej. Black, Gold, Platinum). Requiere permisos de administrador
 *     tags: [NivelSuscripcion]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre del nivel de suscripción
 *                 example: "Platinum"
 *     responses:
 *       201:
 *         description: Nivel de suscripción creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/NivelSuscripcion'
 *                 message:
 *                   type: string
 *                   example: "Nivel de suscripción creado exitosamente"
 *       400:
 *         description: Datos inválidos o nivel ya existe
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       500:
 *         description: Error interno del servidor
 */
router.post("/", authenticate, authorizeAdmin, crearNivelSuscripcion);

/**
 * @swagger
 * /api/niveles-suscripcion/{id}:
 *   put:
 *     summary: Actualizar un nivel de suscripción
 *     description: Actualiza los datos de un nivel de suscripción existente. Requiere permisos de administrador
 *     tags: [NivelSuscripcion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del nivel de suscripción a actualizar
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nuevo nombre del nivel de suscripción
 *                 example: "Gold Premium"
 *     responses:
 *       200:
 *         description: Nivel de suscripción actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/NivelSuscripcion'
 *                 message:
 *                   type: string
 *                   example: "Nivel de suscripción actualizado exitosamente"
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Nivel de suscripción no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put("/:id", authenticate, authorizeAdmin, actualizarNivelSuscripcion);

/**
 * @swagger
 * /api/niveles-suscripcion/{id}:
 *   delete:
 *     summary: Eliminar un nivel de suscripción
 *     description: Elimina un nivel de suscripción del sistema. No se puede eliminar si hay tarjetas asociadas. Requiere permisos de administrador
 *     tags: [NivelSuscripcion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del nivel de suscripción a eliminar
 *         example: 1
 *     responses:
 *       200:
 *         description: Nivel de suscripción eliminado exitosamente
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
 *                   example: "Nivel de suscripción eliminado exitosamente"
 *       400:
 *         description: No se puede eliminar porque hay tarjetas asociadas
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Nivel de suscripción no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete("/:id", authenticate, authorizeAdmin, eliminarNivelSuscripcion);

module.exports = router;
