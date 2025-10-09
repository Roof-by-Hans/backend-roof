const express = require("express");
const { loginCliente } = require("../controllers/authClienteController");

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

module.exports = router;
