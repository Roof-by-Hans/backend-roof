const express = require("express");
const {
  getCategorias,
  getCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  toggleCategoria,
} = require("../controllers/categoriaProductoController");
const { authenticate } = require("../middlewares/authMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: CategoriasProducto
 *   description: Endpoints para gestionar las categorías de productos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CategoriaProducto:
 *       type: object
 *       required:
 *         - id
 *         - nombre
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único de la categoría
 *           example: 1
 *         nombre:
 *           type: string
 *           description: Nombre de la categoría
 *           example: "Whiskies Premium"
 *         idCatPadre:
 *           type: integer
 *           nullable: true
 *           description: Identificador de la categoría padre, si existe
 *           example: null
 *         children:
 *           type: array
 *           description: Lista de subcategorías directas
 *           items:
 *             $ref: '#/components/schemas/CategoriaProducto'
 *   parameters:
 *     CategoriaProductoId:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *       description: Identificador numérico de la categoría
 *   requestBodies:
 *     CrearCategoriaProducto:
 *       description: Datos necesarios para registrar una nueva categoría
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
 *                 example: "Whiskies Premium"
 *               idCatPadre:
 *                 type: integer
 *                 nullable: true
 *                 example: 12
 *           examples:
 *             categoriaRaizWhisky:
 *               summary: Registrar una categoría principal de whiskies
 *               description: Se crea una categoría raíz para agrupar etiquetas de whisky
 *               value:
 *                 nombre: "Whiskies de Malasia"
 *             categoriaHijaHabanos:
 *               summary: Asociar una categoría hija para habanos dentro de tabacos premium
 *               description: Requiere el identificador de la categoría padre ya creada
 *               value:
 *                 nombre: "Habanos Cohiba Maduro"
 *                 idCatPadre: 27
 *     ActualizarCategoriaProducto:
 *       description: Datos opcionales para actualizar una categoría existente
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Whiskies Japoneses"
 *               idCatPadre:
 *                 type: integer
 *                 nullable: true
 *                 example: 12
 */

/**
 * @swagger
 * /api/categorias-producto:
 *   get:
 *     summary: Listar todas las categorías
 *     description: Soporta filtro por estado mediante el parámetro query `estado`.
 *     tags: [CategoriasProducto]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         required: false
 *         description: Filtro por estado de habilitación
 *         schema:
 *           type: string
 *           enum: [habilitados, deshabilitados, todos]
 *           default: todos
 *         example: habilitados
 *     responses:
 *       200:
 *         description: Listado jerárquico de categorías
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
 *                   example: Categorías obtenidas correctamente
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CategoriaProducto'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/", authenticate, getCategorias);

/**
 * @swagger
 * /api/categorias-producto/{id}:
 *   get:
 *     summary: Obtener una categoría por su identificador
 *     tags: [CategoriasProducto]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CategoriaProductoId'
 *     responses:
 *       200:
 *         description: Categoría encontrada
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
 *                   $ref: '#/components/schemas/CategoriaProducto'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", authenticate, getCategoriaPorId);

/**
 * @swagger
 * /api/categorias-producto:
 *   post:
 *     summary: Crear una nueva categoría
 *     tags: [CategoriasProducto]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       $ref: '#/components/requestBodies/CrearCategoriaProducto'
 *     responses:
 *       201:
 *         description: Categoría creada correctamente
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
 *                   $ref: '#/components/schemas/CategoriaProducto'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/", authenticate, crearCategoria);

/**
 * @swagger
 * /api/categorias-producto/{id}:
 *   put:
 *     summary: Actualizar los datos de una categoría
 *     tags: [CategoriasProducto]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CategoriaProductoId'
 *     requestBody:
 *       $ref: '#/components/requestBodies/ActualizarCategoriaProducto'
 *     responses:
 *       200:
 *         description: Categoría actualizada correctamente
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
 *                   $ref: '#/components/schemas/CategoriaProducto'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put("/:id", authenticate, actualizarCategoria);

/**
 * @swagger
 * /api/categorias-producto/{id}/toggle:
 *   patch:
 *     summary: Toggle el estado de habilitación de una categoría
 *     description: Cambia el estado de habilitación de una categoría de habilitado a deshabilitado o viceversa.
 *     tags: [CategoriasProducto]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CategoriaProductoId'
 *     responses:
 *       200:
 *         description: Estado toggled correctamente
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
 *                   example: Categoría deshabilitada correctamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 5
 *                     habilitar:
 *                       type: integer
 *                       example: 0
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch("/:id/toggle", authenticate, toggleCategoria);

/**
 * @swagger
 * /api/categorias-producto/{id}:
 *   delete:
 *     summary: Eliminar una categoría
 *     tags: [CategoriasProducto]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CategoriaProductoId'
 *     responses:
 *       200:
 *         description: Categoría eliminada correctamente
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
 *                       example: 5
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete("/:id", authenticate, eliminarCategoria);

module.exports = router;
