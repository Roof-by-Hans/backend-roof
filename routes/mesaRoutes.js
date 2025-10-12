const express = require("express");
const {
  listarMesas,
  obtenerMesa,
  crearNuevaMesa,
  actualizarMesaExistente,
  eliminarMesaExistente,
} = require("../controllers/mesaController");
const { authenticate } = require("../middlewares/authMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Mesas
 *   description: Administración de mesas individuales y su relación con grupos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CrearMesaRequest:
 *       type: object
 *       required:
 *         - nombre
 *       properties:
 *         nombre:
 *           type: string
 *           description: Nombre legible de la mesa
 *           example: "Mesa Salón 8"
 *     ActualizarMesaRequest:
 *       type: object
 *       properties:
 *         nombre:
 *           type: string
 *           description: Nuevo nombre a asignar a la mesa
 *           example: "Mesa Terraza A"
 */

/**
 * @swagger
 * /api/mesas:
 *   get:
 *     summary: Listar todas las mesas con la información de su grupo, si aplica
 *     tags: [Mesas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mesas obtenidas correctamente
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
 *                   example: Mesas obtenidas correctamente
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MesaConGrupo'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/", authenticate, listarMesas);

/**
 * @swagger
 * /api/mesas/{id}:
 *   get:
 *     summary: Obtener los detalles de una mesa específica
 *     tags: [Mesas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Identificador de la mesa
 *     responses:
 *       200:
 *         description: Mesa encontrada
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
 *                   $ref: '#/components/schemas/MesaConGrupo'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", authenticate, obtenerMesa);

/**
 * @swagger
 * /api/mesas:
 *   post:
 *     summary: Crear una nueva mesa disponible para asignar a grupos
 *     tags: [Mesas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearMesaRequest'
 *     responses:
 *       201:
 *         description: Mesa creada correctamente
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
 *                   $ref: '#/components/schemas/MesaConGrupo'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/", authenticate, crearNuevaMesa);

/**
 * @swagger
 * /api/mesas/{id}:
 *   put:
 *     summary: Actualizar los datos de una mesa existente
 *     tags: [Mesas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Identificador de la mesa a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarMesaRequest'
 *     responses:
 *       200:
 *         description: Mesa actualizada correctamente
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
 *                   $ref: '#/components/schemas/MesaConGrupo'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put("/:id", authenticate, actualizarMesaExistente);

/**
 * @swagger
 * /api/mesas/{id}:
 *   delete:
 *     summary: Eliminar una mesa y desvincularla de cualquier grupo
 *     tags: [Mesas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Mesa eliminada correctamente
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
 *                       example: 12
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete("/:id", authenticate, eliminarMesaExistente);

module.exports = router;
