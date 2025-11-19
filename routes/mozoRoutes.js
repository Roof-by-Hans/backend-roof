const express = require("express");
const router = express.Router();
const {
  getMozos,
  getMozoPorId,
  getMozosActivos,
} = require("../controllers/mozoController");
const {
  authenticate,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Mozos
 *   description: Endpoints para gestionar mozos (usuarios con rol "Mozo")
 */

/**
 * @swagger
 * /api/mozos:
 *   get:
 *     summary: Obtener todos los mozos
 *     description: Retorna una lista de todos los usuarios que tienen asignado el rol "Mozo"
 *     tags: [Mozos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de mozos obtenida correctamente
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
 *                   example: Mozos obtenidos correctamente
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       nombreUsuario:
 *                         type: string
 *                         example: mozo1
 *                       activo:
 *                         type: boolean
 *                         example: true
 *                       fotoPerfil:
 *                         type: string
 *                         nullable: true
 *                         example: usuario-1635123456789-123456789.jpg
 *                       fotoPerfilUrl:
 *                         type: string
 *                         nullable: true
 *                         example: http://localhost:3000/uploads/usuarios/usuario-1635123456789-123456789.jpg
 *                       roles:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["Mozo"]
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get("/", authenticate, getMozos);

/**
 * @swagger
 * /api/mozos/activos:
 *   get:
 *     summary: Obtener solo mozos activos
 *     description: Retorna una lista de usuarios con rol "Mozo" que estén activos
 *     tags: [Mozos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de mozos activos obtenida correctamente
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
 *                   example: Mozos activos obtenidos correctamente
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get("/activos", authenticate, getMozosActivos);

/**
 * @swagger
 * /api/mozos/{id}:
 *   get:
 *     summary: Obtener un mozo por ID
 *     description: Retorna los detalles de un mozo específico
 *     tags: [Mozos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del mozo
 *     responses:
 *       200:
 *         description: Mozo obtenido correctamente
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
 *                   example: Mozo obtenido correctamente
 *                 data:
 *                   type: object
 *       404:
 *         description: Mozo no encontrado
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get("/:id", authenticate, getMozoPorId);

module.exports = router;
