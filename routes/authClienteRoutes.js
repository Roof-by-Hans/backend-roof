const express = require("express");
const {
	loginCliente,
	registrarCliente,
	olvidarContrasenaCliente,
	restablecerContrasenaCliente,
} = require("../controllers/authClienteController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Autenticación Clientes
 *   description: Endpoints para iniciar sesión de clientes (sistema móvil)
 */

/**
 * @swagger
 * /api/auth-cliente/login:
 *   post:
 *     summary: Iniciar sesión como cliente y obtener un token JWT
 *     description: Valida credenciales de un cliente usando email y contraseña, entrega un token firmado junto con el perfil del cliente. Este endpoint es exclusivo para el sistema móvil.
 *     tags: [Autenticación Clientes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - contrasena
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email del cliente
 *               contrasena:
 *                 type: string
 *                 format: password
 *                 description: Contraseña del cliente
 *           examples:
 *             credencialesValidas:
 *               summary: Ejemplo de credenciales válidas
 *               value:
 *                 email: cliente@example.com
 *                 contrasena: MiContrasenaSegura123
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
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
 *                   example: Inicio de sesión exitoso
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: Token JWT para autenticación
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     cliente:
 *                       type: object
 *                       description: Información del cliente autenticado
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         nombre:
 *                           type: string
 *                           example: "Juan"
 *                         apellido:
 *                           type: string
 *                           example: "Pérez"
 *                         email:
 *                           type: string
 *                           example: "juan.perez@example.com"
 *                         telefono:
 *                           type: string
 *                           example: "+54 11 1234-5678"
 *                           nullable: true
 *                         idTarjeta:
 *                           type: integer
 *                           example: 5
 *                           nullable: true
 *                         fotoPerfil:
 *                           type: string
 *                           example: "https://example.com/fotos/juan-perez.jpg"
 *                           nullable: true
 *                         preferencias:
 *                           type: string
 *                           example: "Tema oscuro, notificaciones activadas"
 *                           nullable: true
 *                         tarjeta:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 5
 *                             uuid:
 *                               type: string
 *                               example: "550e8400-e29b-41d4-a716-446655440000"
 *       400:
 *         description: Campos obligatorios faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Los campos email y contrasena son obligatorios
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Credenciales inválidas
 *       403:
 *         description: Cliente sin contraseña configurada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: El cliente no tiene contraseña configurada
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/login", loginCliente);

/**
 * @swagger
 * /api/auth-cliente/registro:
 *   post:
 *     summary: Registrar un nuevo cliente desde la aplicación móvil
 *     description: Crea un nuevo cliente en el sistema y retorna un token JWT para login automático. Este endpoint es público y no requiere autenticación.
 *     tags: [Autenticación Clientes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
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
 *                 example: Juan
 *               apellido:
 *                 type: string
 *                 description: Apellido del cliente
 *                 example: Pérez
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email del cliente (debe ser único)
 *                 example: juan.perez@example.com
 *               telefono:
 *                 type: string
 *                 description: Número de teléfono del cliente (opcional)
 *                 example: "+54 11 1234-5678"
 *               contrasena:
 *                 type: string
 *                 format: password
 *                 description: Contraseña del cliente
 *                 example: MiContrasenaSegura123
 *           examples:
 *             nuevoCliente:
 *               summary: Ejemplo de registro de cliente
 *               value:
 *                 nombre: Juan
 *                 apellido: Pérez
 *                 email: juan.perez@example.com
 *                 telefono: "+54 11 1234-5678"
 *                 contrasena: MiContrasenaSegura123
 *     responses:
 *       201:
 *         description: Cliente registrado exitosamente
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
 *                   example: Cliente registrado exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: Token JWT para autenticación automática
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     cliente:
 *                       type: object
 *                       description: Información del cliente registrado
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         nombre:
 *                           type: string
 *                           example: "Juan"
 *                         apellido:
 *                           type: string
 *                           example: "Pérez"
 *                         email:
 *                           type: string
 *                           example: "juan.perez@example.com"
 *                         telefono:
 *                           type: string
 *                           example: "+54 11 1234-5678"
 *                           nullable: true
 *       400:
 *         description: Datos inválidos o campos obligatorios faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               camposFaltantes:
 *                 summary: Campos requeridos faltantes
 *                 value:
 *                   success: false
 *                   message: Nombre, apellido, email y contraseña son requeridos
 *               emailInvalido:
 *                 summary: Formato de email inválido
 *                 value:
 *                   success: false
 *                   message: El formato del email es inválido
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
router.post("/registro", registrarCliente);

/**
 * @swagger
 * /api/auth-cliente/forgot-password:
 *   post:
 *     summary: Solicitar recuperación de contraseña para cliente
 *     description: Si el email existe, envía un enlace de recuperación. La respuesta es genérica por seguridad.
 *     tags: [Autenticación Clientes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: cliente@example.com
 *     responses:
 *       200:
 *         description: Solicitud procesada
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/forgot-password", olvidarContrasenaCliente);

/**
 * @swagger
 * /api/auth-cliente/reset-password:
 *   post:
 *     summary: Restablecer contraseña de cliente con token
 *     description: Cambia la contraseña si el token es válido y no está expirado.
 *     tags: [Autenticación Clientes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - contrasenaNueva
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token recibido por email
 *               contrasenaNueva:
 *                 type: string
 *                 description: Nueva contraseña (mínimo 6 caracteres)
 *     responses:
 *       200:
 *         description: Contraseña restablecida correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token inválido o expirado
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/reset-password", restablecerContrasenaCliente);

module.exports = router;
