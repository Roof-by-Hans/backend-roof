const express = require("express");
const router = express.Router();
const {
  getClientes,
  getClientePorId,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  desvincularTarjetaCliente,
  toggleCliente,
} = require("../controllers/clienteController");
const {
  authenticate,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");
const { uploadClient, handleMulterError } = require("../config/multer");

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
 *         fotoPerfil:
 *           type: string
 *           description: Nombre del archivo de la foto de perfil del cliente
 *           example: "cliente-1635123456789-123456789.jpg"
 *           nullable: true
 *         fotoPerfilUrl:
 *           type: string
 *           description: URL completa para acceder a la foto de perfil del cliente
 *           example: "http://localhost:3000/uploads/clientes/cliente-1635123456789-123456789.jpg"
 *           nullable: true
 *         preferencias:
 *           type: string
 *           description: Preferencias del usuario almacenadas como texto
 *           example: "Tema oscuro, notificaciones activadas, idioma español"
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
 *         fotoPerfil:
 *           type: string
 *           description: URL de la foto de perfil del cliente (opcional)
 *           example: "https://example.com/fotos/juan-perez.jpg"
 *         preferencias:
 *           type: string
 *           description: Preferencias del usuario almacenadas como texto (opcional)
 *           example: "Tema oscuro, notificaciones activadas"
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
 *         fotoPerfil:
 *           type: string
 *           example: "https://example.com/fotos/nueva-foto.jpg"
 *           nullable: true
 *         preferencias:
 *           type: string
 *           example: "Tema claro, notificaciones desactivadas, idioma inglés"
 *           nullable: true
 */

/**
 * @swagger
 * /api/clientes:
 *   get:
 *     summary: Obtener todos los clientes
 *     description: Devuelve la lista completa de clientes registrados en el sistema con información de tarjeta asociada si existe. Soporta filtro por estado mediante el parámetro query `estado`.
 *     tags: [Clientes]
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
 *     summary: Crear un nuevo cliente con foto de perfil
 *     description: Registra un cliente en la tabla `Cliente`, hasheando la contraseña y validando el formato del email. Opcionalmente incluye una foto de perfil.
 *     tags: [Clientes]
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
 *               - apellido
 *               - email
 *               - contrasena
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre del cliente
 *                 example: "Juan"
 *               apellido:
 *                 type: string
 *                 description: Apellido del cliente
 *                 example: "Pérez"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico único del cliente
 *                 example: "juan.perez@example.com"
 *               contrasena:
 *                 type: string
 *                 description: Contraseña del cliente
 *                 example: "MiContrasenaSegura123"
 *               telefono:
 *                 type: string
 *                 description: Número de teléfono (opcional)
 *                 example: "+54 11 1234-5678"
 *               idTarjeta:
 *                 type: integer
 *                 description: ID de tarjeta asociada (opcional)
 *                 example: 5
 *               preferencias:
 *                 type: string
 *                 description: Preferencias del cliente (opcional)
 *                 example: "Tema oscuro, notificaciones activadas"
 *               fotoPerfil:
 *                 type: string
 *                 format: binary
 *                 description: Foto de perfil del cliente (opcional, máx. 5MB)
 *     responses:
 *       201:
 *         description: Cliente creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClienteDetailResponse'
 *       400:
 *         oneOf:
 *           - $ref: '#/components/responses/BadRequestError'
 *           - $ref: '#/components/responses/FileUploadError'
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
               message: El email ya está registrado
       500:
         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/",
  authenticate,
  authorizeAdmin,
  uploadClient.single("fotoPerfil"),
  handleMulterError,
  crearCliente
);

/**
 * @swagger
 * /api/clientes/{id}:
 *   put:
 *     summary: Actualizar un cliente existente con foto de perfil
 *     description: Permite modificar datos del cliente, aplicando hash si se cambia la contraseña y validando formato de email. Opcionalmente actualiza la foto de perfil.
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
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nuevo nombre del cliente (opcional)
 *                 example: "Juan Carlos"
 *               apellido:
 *                 type: string
 *                 description: Nuevo apellido del cliente (opcional)
 *                 example: "Pérez González"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Nuevo email del cliente (opcional)
 *                 example: "nuevo.email@example.com"
 *               contrasena:
 *                 type: string
 *                 description: Nueva contraseña del cliente (opcional)
 *                 example: "NuevaContrasenaSegura456"
 *               telefono:
 *                 type: string
 *                 description: Nuevo teléfono del cliente (opcional)
 *                 example: "+54 11 9999-8888"
 *               idTarjeta:
 *                 type: integer
 *                 description: Nueva tarjeta asociada (opcional)
 *                 example: 3
 *               preferencias:
 *                 type: string
 *                 description: Nuevas preferencias del cliente (opcional)
 *                 example: "Tema claro, notificaciones por email"
 *               fotoPerfil:
 *                 type: string
 *                 format: binary
 *                 description: Nueva foto de perfil (opcional, máx. 5MB)
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
 *             actualizarFotoPerfil:
 *               summary: Actualizar foto de perfil
 *               value:
 *                 fotoPerfil: "https://example.com/fotos/nueva-foto.jpg"
 *             actualizarPreferencias:
 *               summary: Actualizar preferencias de usuario
 *               value:
 *                 preferencias: "Tema claro, notificaciones por email, idioma inglés"
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
 *         oneOf:
 *           - $ref: '#/components/responses/BadRequestError'
 *           - $ref: '#/components/responses/FileUploadError'
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
               message: El email ya está registrado por otro cliente
       500:
         $ref: '#/components/responses/InternalServerError'
 */
router.put(
  "/:id",
  authenticate,
  authorizeAdmin,
  uploadClient.single("fotoPerfil"),
  handleMulterError,
  actualizarCliente
);

/**
 * @swagger
 * /api/clientes/{id}/desvincular-tarjeta:
 *   patch:
 *     summary: Desvincular la tarjeta asociada a un cliente
 *     description: Elimina la relación entre el cliente y su tarjeta actual y resetea los datos de suscripción de la tarjeta.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Identificador del cliente
 *     responses:
 *       200:
 *         description: Tarjeta desvinculada correctamente
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
 *                   example: Tarjeta desvinculada correctamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     cliente:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         nombre:
 *                           type: string
 *                         apellido:
 *                           type: string
 *                     tarjeta:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         uuid:
 *                           type: string
 *                         tipoSuscripcionAnterior:
 *                           type: string
 *                           nullable: true
 *                         nivelSuscripcionAnterior:
 *                           type: string
 *                           nullable: true
 *                         saldoAnterior:
 *                           type: number
 *                           nullable: true
 *       400:
 *         description: El cliente no tiene tarjeta asociada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Cliente no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
  "/:id/desvincular-tarjeta",
  authenticate,
  authorizeAdmin,
  desvincularTarjetaCliente
);

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
               message: No se puede eliminar el cliente porque tiene registros relacionados
       500:
         $ref: '#/components/responses/InternalServerError'
 */
  router.delete("/:id", authenticate, authorizeAdmin, eliminarCliente);

/**
 * @swagger
 * /api/clientes/{id}/toggle:
 *   patch:
 *     summary: Toggle el estado de habilitación de un cliente
 *     description: Cambia el estado de habilitación de un cliente de habilitado a deshabilitado o viceversa.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
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
 *                   example: Cliente deshabilitado correctamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
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
router.patch("/:id/toggle", authenticate, authorizeAdmin, toggleCliente);

module.exports = router;
