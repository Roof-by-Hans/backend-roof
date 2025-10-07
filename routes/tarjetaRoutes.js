const express = require("express");
const router = express.Router();
const {
  getTarjetas,
  getTarjetaPorId,
  crearTarjeta,
  actualizarTarjeta,
  eliminarTarjeta,
  actualizarSaldo,
} = require("../controllers/tarjetaController");
const {
  authenticate,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Tarjetas
 *   description: Endpoints para gestionar tarjetas del sistema (tarjetas de suscripción/membresía)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Tarjeta:
 *       type: object
 *       required:
 *         - id
 *         - uuid
 *         - idTipoSuscripcion
 *         - saldoActual
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único de la tarjeta en la base de datos
 *           example: 1
 *         uuid:
 *           type: string
 *           description: UUID único de la tarjeta física
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         idTipoSuscripcion:
 *           type: integer
 *           description: ID del tipo de suscripción (requerido)
 *           example: 1
 *         nombreTipoSuscripcion:
 *           type: string
 *           description: Nombre del tipo de suscripción
 *           example: "PREPAGA"
 *         idNivelSuscripcion:
 *           type: integer
 *           description: ID del nivel de suscripción (opcional)
 *           example: 2
 *         nombreNivelSuscripcion:
 *           type: string
 *           description: Nombre del nivel de suscripción
 *           example: "Black"
 *         limiteCreditoNivel:
 *           type: number
 *           format: decimal
 *           description: Límite de crédito del nivel de suscripción
 *           example: 50000.00
 *         saldoActual:
 *           type: number
 *           format: decimal
 *           description: Saldo actual disponible en la tarjeta
 *           example: 5000.50
 *
 *     TarjetaInput:
 *       type: object
 *       required:
 *         - uuid
 *         - idTipoSuscripcion
 *       properties:
 *         uuid:
 *           type: string
 *           description: UUID único de la tarjeta física (debe ser único)
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         idTipoSuscripcion:
 *           type: integer
 *           description: ID del tipo de suscripción (1=PREPAGA, 2=CREDITO)
 *           example: 1
 *         idNivelSuscripcion:
 *           type: integer
 *           description: ID del nivel de suscripción (opcional)
 *           example: 2
 *         saldoActual:
 *           type: number
 *           format: decimal
 *           description: Saldo inicial (opcional, por defecto 0.00)
 *           example: 1000.00
 *
 *     TarjetaUpdate:
 *       type: object
 *       properties:
 *         idTipoSuscripcion:
 *           type: integer
 *           description: Nuevo tipo de suscripción
 *           example: 2
 *         idNivelSuscripcion:
 *           type: integer
 *           description: Nuevo nivel de suscripción
 *           example: 3
 *         saldoActual:
 *           type: number
 *           format: decimal
 *           description: Nuevo saldo
 *           example: 2500.00
 *
 *     SaldoUpdate:
 *       type: object
 *       required:
 *         - monto
 *         - operacion
 *       properties:
 *         monto:
 *           type: number
 *           format: decimal
 *           description: Monto a agregar o restar
 *           example: 500.00
 *         operacion:
 *           type: string
 *           enum: [agregar, restar]
 *           description: Tipo de operación sobre el saldo
 *           example: "agregar"
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Mensaje de error"
 *         error:
 *           type: string
 *           example: "Detalle técnico del error"
 *
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           oneOf:
 *             - $ref: '#/components/schemas/Tarjeta'
 *             - type: array
 *               items:
 *                 $ref: '#/components/schemas/Tarjeta'
 *         message:
 *           type: string
 *           example: "Operación exitosa"
 */

/**
 * @swagger
 * /api/tarjetas:
 *   get:
 *     summary: Obtener todas las tarjetas
 *     description: Retorna una lista con todas las tarjetas registradas en el sistema con información de tipo y nivel de suscripción
 *     tags: [Tarjetas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tarjetas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Tarjeta'
 *                 message:
 *                   type: string
 *                   example: "Tarjetas obtenidas correctamente"
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos (requiere rol admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", authenticate, authorizeAdmin, getTarjetas);

/**
 * @swagger
 * /api/tarjetas/{id}:
 *   get:
 *     summary: Obtener una tarjeta por ID
 *     description: Retorna la información detallada de una tarjeta específica incluyendo tipo y nivel de suscripción
 *     tags: [Tarjetas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la tarjeta
 *         example: 1
 *     responses:
 *       200:
 *         description: Tarjeta encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tarjeta'
 *                 message:
 *                   type: string
 *                   example: "Tarjeta obtenida correctamente"
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tarjeta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", authenticate, authorizeAdmin, getTarjetaPorId);

/**
 * @swagger
 * /api/tarjetas:
 *   post:
 *     summary: Crear una nueva tarjeta
 *     description: |
 *       Registra una nueva tarjeta física en el sistema.
 *       El UUID debe obtenerse de la tarjeta física y debe ser único.
 *     tags: [Tarjetas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TarjetaInput'
 *           examples:
 *             ejemplo1:
 *               summary: Tarjeta PREPAGA con nivel Black
 *               value:
 *                 uuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 idTipoSuscripcion: 1
 *                 idNivelSuscripcion: 2
 *                 saldoActual: 1000.00
 *             ejemplo2:
 *               summary: Tarjeta CREDITO sin nivel específico
 *               value:
 *                 uuid: "b2c3d4e5-f6g7-8901-bcde-f23456789012"
 *                 idTipoSuscripcion: 2
 *                 saldoActual: 0.00
 *     responses:
 *       201:
 *         description: Tarjeta creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tarjeta'
 *                 message:
 *                   type: string
 *                   example: "Tarjeta creada exitosamente"
 *       400:
 *         description: |
 *           Datos inválidos:
 *           - UUID requerido
 *           - UUID vacío o inválido
 *           - Saldo inválido (debe ser >= 0)
 *           - Tipo de suscripción requerido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "El UUID de la tarjeta física es requerido"
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos (requiere rol admin)
 *       404:
 *         description: Tipo o nivel de suscripción no encontrado
 *       409:
 *         description: UUID ya registrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Ya existe una tarjeta registrada con ese UUID"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", authenticate, authorizeAdmin, crearTarjeta);

/**
 * @swagger
 * /api/tarjetas/{id}:
 *   put:
 *     summary: Actualizar una tarjeta
 *     description: |
 *       Actualiza los datos de una tarjeta existente.
 *       Nota: El UUID no se puede modificar ya que corresponde a la tarjeta física.
 *     tags: [Tarjetas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la tarjeta en la base de datos
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TarjetaUpdate'
 *           examples:
 *             ejemplo1:
 *               summary: Cambiar nivel de suscripción
 *               value:
 *                 idNivelSuscripcion: 3
 *             ejemplo2:
 *               summary: Actualizar saldo y tipo
 *               value:
 *                 idTipoSuscripcion: 2
 *                 saldoActual: 5000.00
 *     responses:
 *       200:
 *         description: Tarjeta actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tarjeta'
 *                 message:
 *                   type: string
 *                   example: "Tarjeta actualizada exitosamente"
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tarjeta, tipo o nivel no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Número de tarjeta duplicado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/:id", authenticate, authorizeAdmin, actualizarTarjeta);

/**
 * @swagger
 * /api/tarjetas/{id}/saldo:
 *   patch:
 *     summary: Actualizar saldo de una tarjeta
 *     description: Agrega o resta un monto al saldo actual de la tarjeta. No permite saldo negativo al restar.
 *     tags: [Tarjetas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la tarjeta
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SaldoUpdate'
 *           examples:
 *             agregar:
 *               summary: Agregar saldo
 *               value:
 *                 monto: 500.00
 *                 operacion: "agregar"
 *             restar:
 *               summary: Restar saldo
 *               value:
 *                 monto: 200.00
 *                 operacion: "restar"
 *     responses:
 *       200:
 *         description: Saldo actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Tarjeta'
 *                 message:
 *                   type: string
 *                   example: "Saldo agregado exitosamente"
 *       400:
 *         description: Datos inválidos o saldo insuficiente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tarjeta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id/saldo", authenticate, authorizeAdmin, actualizarSaldo);

/**
 * @swagger
 * /api/tarjetas/{id}:
 *   delete:
 *     summary: Eliminar una tarjeta
 *     description: Elimina permanentemente una tarjeta del sistema
 *     tags: [Tarjetas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la tarjeta
 *         example: 1
 *     responses:
 *       200:
 *         description: Tarjeta eliminada exitosamente
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
 *                   example: "Tarjeta eliminada exitosamente"
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tarjeta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", authenticate, authorizeAdmin, eliminarTarjeta);

module.exports = router;
