const express = require("express");
const router = express.Router();
const {
  getTiposSuscripcion,
  getTipoSuscripcionPorId,
  crearTipoSuscripcion,
  actualizarTipoSuscripcion,
  eliminarTipoSuscripcion,
} = require("../controllers/tipoSuscripcionController");
const {
  authenticate,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: TipoSuscripcion
 *   description: Endpoints para gestionar tipos de suscripción
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
 *           description: Nombre del tipo de suscripción
 *           example: "Mensual"
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

/**
 * @swagger
 * /api/tipos-suscripcion:
 *   post:
 *     summary: Crear un nuevo tipo de suscripción
 *     description: Crea un nuevo tipo de suscripción en el sistema. Requiere permisos de administrador
 *     tags: [TipoSuscripcion]
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
 *                 description: Nombre del tipo de suscripción
 *                 example: "Anual"
 *     responses:
 *       201:
 *         description: Tipo de suscripción creado exitosamente
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
 *                   example: "Tipo de suscripción creado exitosamente"
 *       400:
 *         description: Datos inválidos o tipo ya existe
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       500:
 *         description: Error interno del servidor
 */
router.post("/", authenticate, authorizeAdmin, crearTipoSuscripcion);

/**
 * @swagger
 * /api/tipos-suscripcion/{id}:
 *   put:
 *     summary: Actualizar un tipo de suscripción
 *     description: Actualiza los datos de un tipo de suscripción existente. Requiere permisos de administrador
 *     tags: [TipoSuscripcion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tipo de suscripción a actualizar
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
 *                 description: Nuevo nombre del tipo de suscripción
 *                 example: "Mensual Premium"
 *     responses:
 *       200:
 *         description: Tipo de suscripción actualizado exitosamente
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
 *                   example: "Tipo de suscripción actualizado exitosamente"
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Tipo de suscripción no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put("/:id", authenticate, authorizeAdmin, actualizarTipoSuscripcion);

/**
 * @swagger
 * /api/tipos-suscripcion/{id}:
 *   delete:
 *     summary: Eliminar un tipo de suscripción
 *     description: Elimina un tipo de suscripción del sistema. No se puede eliminar si hay tarjetas asociadas. Requiere permisos de administrador
 *     tags: [TipoSuscripcion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tipo de suscripción a eliminar
 *         example: 1
 *     responses:
 *       200:
 *         description: Tipo de suscripción eliminado exitosamente
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
 *                   example: "Tipo de suscripción eliminado exitosamente"
 *       400:
 *         description: No se puede eliminar porque hay tarjetas asociadas
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Tipo de suscripción no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete("/:id", authenticate, authorizeAdmin, eliminarTipoSuscripcion);

module.exports = router;
