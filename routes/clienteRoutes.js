const express = require("express");
const router = express.Router();
const {
  getClientes,
  getClientePorId,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
} = require("../controllers/clienteController");
const {
  authenticate,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Clientes
 *   description: Endpoints para gestionar clientes del sistema
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Cliente:
 *       type: object
 *       required:
 *         - id
 *         - nombre
 *         - apellido
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único del cliente en la base de datos
 *           example: 1
 *         nombre:
 *           type: string
 *           description: Nombre del cliente
 *           example: Juan
 *         apellido:
 *           type: string
 *           description: Apellido del cliente
 *           example: Pérez
 *         telefono:
 *           type: string
 *           description: Número de teléfono del cliente
 *           example: "+54 11 1234-5678"
 *           nullable: true
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico del cliente (debe ser único)
 *           example: juan.perez@example.com
 *         idTarjeta:
 *           type: integer
 *           description: ID de la tarjeta asociada al cliente
 *           example: 5
 *           nullable: true
 *         tarjeta:
 *           type: object
 *           description: Información de la tarjeta asociada (si existe)
 *           properties:
 *             id:
 *               type: integer
 *               example: 5
 *             uuid:
 *               type: string
 *               example: "550e8400-e29b-41d4-a716-446655440000"
 *     ClienteListResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Clientes obtenidos correctamente
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Cliente'
 *     ClienteDetailResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Cliente obtenido correctamente
 *         data:
 *           $ref: '#/components/schemas/Cliente'
 *     CrearClienteRequest:
 *       type: object
 *       required:
 *         - nombre
 *         - apellido
 *         - email
 *         - contrasena
 *       properties:
 *         nombre:
 *           type: string
 *           description: Nombre del cliente
 *           example: Juan
 *         apellido:
 *           type: string
 *           description: Apellido del cliente
 *           example: Pérez
 *         telefono:
 *           type: string
 *           description: Número de teléfono del cliente (opcional)
 *           example: "+54 11 1234-5678"
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico único del cliente
 *           example: juan.perez@example.com
 *         contrasena:
 *           type: string
 *           description: Contraseña en texto plano que será hasheada
 *           example: MiContrasenaSegura123
 *         idTarjeta:
 *           type: integer
 *           description: ID de la tarjeta a asociar (opcional)
 *           example: 5
 *     ActualizarClienteRequest:
 *       type: object
 *       description: Campos opcionales a actualizar; se puede enviar uno o varios
 *       properties:
 *         nombre:
 *           type: string
 *           example: Juan Carlos
 *         apellido:
 *           type: string
 *           example: Pérez García
 *         telefono:
 *           type: string
 *           example: "+54 11 9876-5432"
 *         email:
 *           type: string
 *           format: email
 *           example: juancarlos.perez@example.com
 *         contrasena:
 *           type: string
 *           example: NuevaContrasena456
 *         idTarjeta:
 *           type: integer
 *           example: 10
 *           nullable: true
 */

/**
 * @swagger
 * /api/clientes:
 *   get:
 *     summary: Obtener todos los clientes
 *     description: Devuelve la lista completa de clientes registrados en el sistema con información de tarjeta asociada si existe.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Clientes obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClienteListResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/", authenticate, authorizeAdmin, getClientes);

/**
 * @swagger
 * /api/clientes/{id}:
 *   get:
 *     summary: Obtener un cliente por su ID
 *     description: Recupera un único cliente con su información completa y tarjeta asociada. El identificador corresponde a la columna `id_cliente`.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador numérico del cliente objetivo
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cliente obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClienteDetailResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", authenticate, authorizeAdmin, getClientePorId);

/**
 * @swagger
 * /api/clientes:
 *   post:
 *     summary: Crear un nuevo cliente
 *     description: Registra un cliente en la tabla `Cliente`, hasheando la contraseña y validando el formato del email.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearClienteRequest'
 *           examples:
 *             clienteBasico:
 *               summary: Cliente con datos básicos
 *               value:
 *                 nombre: Juan
 *                 apellido: Pérez
 *                 email: juan.perez@example.com
 *                 contrasena: MiContrasenaSegura123
 *             clienteCompleto:
 *               summary: Cliente con todos los datos
 *               value:
 *                 nombre: María
 *                 apellido: García
 *                 telefono: "+54 11 1234-5678"
 *                 email: maria.garcia@example.com
 *                 contrasena: MiContrasenaSegura123
 *                 idTarjeta: 5
 *     responses:
 *       201:
 *         description: Cliente creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClienteDetailResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: La tarjeta especificada no existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: La tarjeta especificada no existe
 *       409:
 *         description: El email ya está registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: El email ya está registrado
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/", authenticate, authorizeAdmin, crearCliente);

/**
 * @swagger
 * /api/clientes/{id}:
 *   put:
 *     summary: Actualizar un cliente existente
 *     description: Permite modificar datos del cliente, aplicando hash si se cambia la contraseña y validando formato de email.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del cliente a actualizar
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarClienteRequest'
 *           examples:
 *             cambiarEmail:
 *               summary: Modificar el email del cliente
 *               value:
 *                 email: nuevo.email@example.com
 *             actualizarTelefono:
 *               summary: Actualizar teléfono
 *               value:
 *                 telefono: "+54 11 9999-8888"
 *             cambiarPassword:
 *               summary: Cambiar contraseña
 *               value:
 *                 contrasena: NuevaContrasenaSegura456
 *             desasociarTarjeta:
 *               summary: Quitar tarjeta asociada
 *               value:
 *                 idTarjeta: null
 *     responses:
 *       200:
 *         description: Cliente actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClienteDetailResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Cliente o tarjeta no encontrados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: El email ya está registrado por otro cliente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: El email ya está registrado por otro cliente
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put("/:id", authenticate, authorizeAdmin, actualizarCliente);

/**
 * @swagger
 * /api/clientes/{id}:
 *   delete:
 *     summary: Eliminar un cliente
 *     description: Borra el registro del cliente. Si tiene registros relacionados (suscripciones, movimientos, etc.), la operación fallará.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del cliente que se desea eliminar
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cliente eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensajeResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: No se puede eliminar porque tiene registros relacionados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: No se puede eliminar el cliente porque tiene registros relacionados
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete("/:id", authenticate, authorizeAdmin, eliminarCliente);

module.exports = router;
