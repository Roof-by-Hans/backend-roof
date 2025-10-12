const express = require("express");
const {
  listarGruposConMesas,
  crearGrupo,
  obtenerGrupo,
  disolverGrupo,
} = require("../controllers/mesaGrupoController");
const { authenticate } = require("../middlewares/authMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: MesasGrupo
 *   description: Gestión de mesas y agrupaciones para consumos compartidos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MesaConGrupo:
 *       type: object
 *       required:
 *         - idMesa
 *         - nombreMesa
 *       properties:
 *         idMesa:
 *           type: integer
 *           description: Identificador único de la mesa
 *           example: 12
 *         nombreMesa:
 *           type: string
 *           description: Nombre o código de referencia de la mesa
 *           example: "Mesa Terraza 4"
 *         grupo:
 *           type: object
 *           nullable: true
 *           description: Grupo al que pertenece la mesa, si aplica
 *           properties:
 *             id:
 *               type: integer
 *               example: 5
 *             nombre:
 *               type: string
 *               example: "Grupo Cohiba"
 *     GrupoMesas:
 *       type: object
 *       required:
 *         - id
 *         - nombre
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único del grupo de mesas
 *           example: 7
 *         nombre:
 *           type: string
 *           description: Nombre asignado al grupo
 *           example: "Grupo Macallan Noche"
 *     GrupoMesasDetalle:
 *       allOf:
 *         - $ref: '#/components/schemas/GrupoMesas'
 *       properties:
 *         mesas:
 *           type: array
 *           description: Relación de mesas que integran el grupo
 *           items:
 *             type: object
 *             required:
 *               - id
 *               - nombre
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 3
 *               nombre:
 *                 type: string
 *                 example: "Mesa Salón 2"
 *   requestBodies:
 *     CrearGrupoMesas:
 *       description: Datos necesarios para conformar un nuevo grupo de mesas
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
 *                 example: "Grupo Reserva Especial"
 *               mesas:
 *                 type: array
 *                 description: Identificadores de las mesas a agrupar
 *                 items:
 *                   type: integer
 *                 example: [1, 4, 7]
 */

/**
 * @swagger
 * /api/mesas-grupo/grupos:
 *   get:
 *     summary: Listar todos los grupos de mesas con sus integrantes
 *     tags: [MesasGrupo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Grupos obtenidos correctamente
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
 *                   example: Grupos obtenidos correctamente
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GrupoMesasDetalle'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/grupos", authenticate, listarGruposConMesas);

/**
 * @swagger
 * /api/mesas-grupo/grupos:
 *   post:
 *     summary: Crear un nuevo grupo de mesas
 *     tags: [MesasGrupo]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       $ref: '#/components/requestBodies/CrearGrupoMesas'
 *     responses:
 *       201:
 *         description: Grupo creado satisfactoriamente
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
 *                   $ref: '#/components/schemas/GrupoMesasDetalle'
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
router.post("/grupos", authenticate, crearGrupo);

/**
 * @swagger
 * /api/mesas-grupo/grupos/{id}:
 *   get:
 *     summary: Obtener los detalles de un grupo de mesas
 *     tags: [MesasGrupo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Identificador del grupo de mesas
 *     responses:
 *       200:
 *         description: Información del grupo de mesas
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
 *                   $ref: '#/components/schemas/GrupoMesasDetalle'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/grupos/:id", authenticate, obtenerGrupo);

/**
 * @swagger
 * /api/mesas-grupo/grupos/{id}:
 *   delete:
 *     summary: Disolver un grupo de mesas existente
 *     tags: [MesasGrupo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Identificador del grupo de mesas a eliminar
 *     responses:
 *       200:
 *         description: Grupo eliminado correctamente
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
 *                       example: 7
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete("/grupos/:id", authenticate, disolverGrupo);

module.exports = router;
