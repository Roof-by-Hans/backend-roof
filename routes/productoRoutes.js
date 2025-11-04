const express = require("express");
const {
  getProductos,
  getProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} = require("../controllers/productoController");
const { authenticate } = require("../middlewares/authMiddleware");
const { uploadProduct, handleMulterError } = require("../config/multer");

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
 *         fotoPrincipal:
 *           type: string
 *           description: Nombre del archivo de la foto principal del producto
 *           example: "producto-1635123456789-123456789.jpg"
 *           nullable: true
 *         fotoPrincipalUrl:
 *           type: string
 *           description: URL completa para acceder a la foto principal del producto
 *           example: "http://localhost:3000/uploads/productos/producto-1635123456789-123456789.jpg"
 *           nullable: true
 *         descripcion:
 *           type: string
 *           description: Descripción detallada del producto
 *           example: "Whisky escocés de malta única, envejecido durante 18 años en barricas de roble europeo. Notas de frutas secas, especias y vainilla."
 *           nullable: true
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
 *               fotoPrincipal:
 *                 type: string
 *                 description: URL de la foto principal del producto (opcional)
 *                 example: "https://example.com/productos/lagavulin-16.jpg"
 *               descripcion:
 *                 type: string
 *                 description: Descripción detallada del producto (opcional)
 *                 example: "Whisky escocés de Islay con intenso sabor ahumado y notas marinas"
 *           examples:
 *             whiskyPremium:
 *               summary: Registrar un whisky de etiqueta premium
 *               value:
 *                 nombre: "Whisky Glenfiddich Gran Reserva"
 *                 precioUnitario: 245.5
 *                 idCategoria: 5
 *                 fotoPrincipal: "https://example.com/productos/glenfiddich.jpg"
 *                 descripcion: "Whisky escocés de malta única con 18 años de maduración. Aromas florales y notas de roble."
 *             habanoSeleccion:
 *               summary: Registrar un habano como producto unitario
 *               value:
 *                 nombre: "Habano Cohiba Sublimes Edición Limitada"
 *                 precioUnitario: 58.75
 *                 idCategoria: 12
 *                 fotoPrincipal: "https://example.com/productos/cohiba-sublime.jpg"
 *                 descripcion: "Habano cubano premium con capa especial y mezcla exclusiva de tabacos selectos."
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
 *               fotoPrincipal:
 *                 type: string
 *                 example: "https://example.com/productos/lagavulin-edicion-especial.jpg"
 *                 nullable: true
 *               descripcion:
 *                 type: string
 *                 example: "Edición especial con caja de madera y botella numerada. Sabor intenso y complejo."
 *                 nullable: true
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
 *     summary: Crear un nuevo producto con imagen
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - precio_unitario
 *               - id_categoria
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre del producto
 *                 example: "Whisky Lagavulin 16"
 *               precio_unitario:
 *                 type: number
 *                 format: double
 *                 description: Precio unitario del producto
 *                 example: 189.99
 *               id_categoria:
 *                 type: integer
 *                 description: ID de la categoría del producto
 *                 example: 5
 *               descripcion:
 *                 type: string
 *                 description: Descripción del producto (opcional)
 *                 example: "Whisky escocés de Islay con intenso sabor ahumado"
 *               imagen:
 *                 type: string
 *                 format: binary
 *                 description: Imagen del producto (máx. 5MB, solo imágenes)
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
 *         oneOf:
 *           - $ref: '#/components/responses/BadRequestError'
 *           - $ref: '#/components/responses/FileUploadError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/", authenticate, uploadProduct.single('imagen'), handleMulterError, crearProducto);

/**
 * @swagger
 * /api/productos/{id}:
 *   put:
 *     summary: Actualizar los datos de un producto con imagen
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ProductoId'
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nuevo nombre del producto (opcional)
 *                 example: "Whisky Lagavulin 16 Edición Especial"
 *               precio_unitario:
 *                 type: number
 *                 format: double
 *                 description: Nuevo precio unitario (opcional)
 *                 example: 199.99
 *               id_categoria:
 *                 type: integer
 *                 description: Nueva categoría del producto (opcional)
 *                 example: 5
 *               descripcion:
 *                 type: string
 *                 description: Nueva descripción del producto (opcional)
 *                 example: "Whisky escocés premium con notas ahumadas intensas"
 *               imagen:
 *                 type: string
 *                 format: binary
 *                 description: Nueva imagen del producto (opcional, máx. 5MB)
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
router.put("/:id", authenticate, uploadProduct.single('imagen'), handleMulterError, actualizarProducto);

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
