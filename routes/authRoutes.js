const express = require("express");
const { login } = require("../controllers/authController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Autenticación
 *   description: Endpoints para iniciar sesión y manejar tokens
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión y obtener un token JWT
 *     description: Valida credenciales, verifica el estado del usuario y entrega un token firmado junto con el perfil básico.
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             credencialesValidas:
 *               summary: Ejemplo de credenciales válidas
 *               value:
 *                 nombreUsuario: admin
 *                 contrasena: MiContrasenaSegura123
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
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
 *         description: Usuario inactivo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: La sesión no está activa
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/login", login);

module.exports = router;
