const express = require("express");
const {
  getProductos,
  getProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} = require("../controllers/productoController");
const { authenticate } = require("../middlewares/authMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Productos
 *   description: Endpoints para gestionar el catálogo de productos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Producto:
 *       type: object
 *       required:
 *         - id
 *         - nombre
 *         - precioUnitario
 *         - idCategoria
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único del producto
 *           example: 101
 *         nombre:
 *           type: string
 *           description: Nombre comercial del producto
 *           example: "Whisky Macallan 18"
 *         precioUnitario:
 *           type: number
 *           format: double
 *           description: Precio de venta con dos decimales
 *           example: 365.90
 *         idCategoria:
 *           type: integer
 *           description: Identificador de la categoría asociada
 *           example: 5
 *         categoria:
 *           type: object
 *           nullable: true
 *           description: Información resumida de la categoría actual del producto
 *           properties:
 *             id:
 *               type: integer
 *               example: 5
 *             nombre:
 *               type: string
 *               example: "Whiskies Premium"
 *   parameters:
 *     ProductoId:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *       description: Identificador numérico del producto
 *   requestBodies:
 *     CrearProducto:
 *       description: Datos necesarios para registrar un nuevo producto
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - precioUnitario
 *               - idCategoria
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Whisky Lagavulin 16"
 *               precioUnitario:
 *                 type: number
 *                 format: double
 *                 example: 189.99
 *               idCategoria:
 *                 type: integer
 *                 example: 5
 *           examples:
 *             whiskyPremium:
 *               summary: Registrar un whisky de etiqueta premium
 *               value:
 *                 nombre: "Whisky Glenfiddich Gran Reserva"
 *                 precioUnitario: 245.5
 *                 idCategoria: 5
 *             habanoSeleccion:
 *               summary: Registrar un habano como producto unitario
 *               value:
 *                 nombre: "Habano Cohiba Sublimes Edición Limitada"
 *                 precioUnitario: 58.75
 *                 idCategoria: 12
 *     ActualizarProducto:
 *       description: Campos opcionales para actualizar un producto existente
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Whisky Lagavulin 16 - Caja Edición Especial"
 *               precioUnitario:
 *                 type: number
 *                 format: double
 *                 example: 215.0
 *               idCategoria:
 *                 type: integer
 *                 example: 7
 */

/**
 * @swagger
 * /api/productos:
 *   get:
 *     summary: Listar todos los productos disponibles
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Listado de productos con su categoría asociada
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
 *                   example: Productos obtenidos correctamente
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Producto'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/", authenticate, getProductos);

/**
 * @swagger
 * /api/productos/{id}:
 *   get:
 *     summary: Obtener un producto por su identificador
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ProductoId'
 *     responses:
 *       200:
 *         description: Producto encontrado
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
 *                   $ref: '#/components/schemas/Producto'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", authenticate, getProductoPorId);

/**
 * @swagger
 * /api/productos:
 *   post:
 *     summary: Crear un nuevo producto
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       $ref: '#/components/requestBodies/CrearProducto'
 *     responses:
 *       201:
 *         description: Producto creado correctamente
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
 *                   $ref: '#/components/schemas/Producto'
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
router.post("/", authenticate, crearProducto);

/**
 * @swagger
 * /api/productos/{id}:
 *   put:
 *     summary: Actualizar los datos de un producto
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ProductoId'
 *     requestBody:
 *       $ref: '#/components/requestBodies/ActualizarProducto'
 *     responses:
 *       200:
 *         description: Producto actualizado correctamente
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
 *                   $ref: '#/components/schemas/Producto'
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
router.put("/:id", authenticate, actualizarProducto);

/**
 * @swagger
 * /api/productos/{id}:
 *   delete:
 *     summary: Eliminar un producto del catálogo
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ProductoId'
 *     responses:
 *       200:
 *         description: Producto eliminado correctamente
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
 *                       example: 101
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
router.delete("/:id", authenticate, eliminarProducto);

module.exports = router;
