const express = require("express");
const router = express.Router();
const {
  getTarjetas,
  getTarjetaPorId,
  crearTarjeta,
  actualizarTarjeta,
  eliminarTarjeta,
  actualizarSaldo,
  validarNFC,
  descontarSaldo,
  recargarSaldo,
  buscarPorUID,
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
 *         - numero
 *         - idTipoSuscripcion
 *         - idNivelSuscripcion
 *         - saldoActual
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único de la tarjeta en la base de datos
 *           example: 1
 *         numero:
 *           type: string
 *           description: Número identificador de la tarjeta
 *           example: "ROOF-001-2025"
 *         idTipoSuscripcion:
 *           type: integer
 *           description: ID del tipo de suscripción
 *           example: 1
 *         nombreTipoSuscripcion:
 *           type: string
 *           description: Nombre del tipo de suscripción
 *           example: "Premium"
 *         idNivelSuscripcion:
 *           type: integer
 *           description: ID del nivel de suscripción
 *           example: 2
 *         nombreNivelSuscripcion:
 *           type: string
 *           description: Nombre del nivel de suscripción
 *           example: "Gold"
 *         saldoActual:
 *           type: number
 *           format: float
 *           description: Saldo actual disponible en la tarjeta
 *           example: 5000.50
 *
 *     TarjetaInput:
 *       type: object
 *       required:
 *         - numero
 *         - idTipoSuscripcion
 *         - idNivelSuscripcion
 *       properties:
 *         numero:
 *           type: string
 *           description: Número identificador de la tarjeta (debe ser único)
 *           example: "ROOF-001-2025"
 *         idTipoSuscripcion:
 *           type: integer
 *           description: ID del tipo de suscripción
 *           example: 1
 *         idNivelSuscripcion:
 *           type: integer
 *           description: ID del nivel de suscripción
 *           example: 2
 *         saldoActual:
 *           type: number
 *           format: float
 *           description: Saldo inicial (opcional, por defecto 0)
 *           example: 1000.00
 *
 *     TarjetaUpdate:
 *       type: object
 *       properties:
 *         numero:
 *           type: string
 *           description: Nuevo número de la tarjeta
 *           example: "ROOF-001-2026"
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
 *           format: float
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
 *           format: float
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
 *     description: Registra una nueva tarjeta en el sistema con un tipo y nivel de suscripción
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
 *               summary: Tarjeta Premium Gold
 *               value:
 *                 numero: "ROOF-001-2025"
 *                 idTipoSuscripcion: 1
 *                 idNivelSuscripcion: 2
 *                 saldoActual: 1000.00
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
 *         description: Tipo o nivel de suscripción no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Número de tarjeta ya existe
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
router.post("/", authenticate, authorizeAdmin, crearTarjeta);

/**
 * @swagger
 * /api/tarjetas/{id}:
 *   put:
 *     summary: Actualizar una tarjeta
 *     description: Actualiza los datos de una tarjeta existente (número, tipo de suscripción, nivel o saldo)
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
 *             $ref: '#/components/schemas/TarjetaUpdate'
 *           examples:
 *             ejemplo1:
 *               summary: Cambiar nivel de suscripción
 *               value:
 *                 idNivelSuscripcion: 3
 *             ejemplo2:
 *               summary: Actualizar saldo
 *               value:
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

// ========================================
// ENDPOINTS PARA SISTEMA NFC (Sin autenticación JWT)
// Estos endpoints son usados por el lector NFC físico
// ========================================

/**
 * @swagger
 * /api/tarjetas/nfc/validar/{uid}:
 *   get:
 *     summary: Validar tarjeta NFC (para lector físico)
 *     description: Valida si una tarjeta NFC es válida y tiene saldo. No requiere autenticación JWT ya que es usado directamente por el lector NFC físico
 *     tags: [Tarjetas]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: UID único de la tarjeta NFC física
 *         example: "A1B2C3D4E5F6"
 *     responses:
 *       200:
 *         description: Tarjeta válida - Acceso permitido
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
 *                   example: "Tarjeta válida - Acceso permitido"
 *       400:
 *         description: UID inválido
 *       403:
 *         description: Saldo insuficiente
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
 *                   example: "Saldo insuficiente"
 *                 saldo:
 *                   type: number
 *                   example: 0
 *       404:
 *         description: Tarjeta no registrada
 *       500:
 *         description: Error interno del servidor
 */
router.get("/nfc/validar/:uid", validarNFC);

/**
 * @swagger
 * /api/tarjetas/nfc/descontar/{uid}:
 *   post:
 *     summary: Descontar saldo de tarjeta NFC (para lector físico)
 *     description: Descuenta un monto del saldo de la tarjeta cuando se usa. No requiere autenticación JWT ya que es usado directamente por el lector NFC físico. Usa transacciones para garantizar consistencia
 *     tags: [Tarjetas]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: UID único de la tarjeta NFC física
 *         example: "A1B2C3D4E5F6"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - monto
 *             properties:
 *               monto:
 *                 type: number
 *                 format: float
 *                 description: Monto a descontar del saldo
 *                 example: 50.00
 *               concepto:
 *                 type: string
 *                 description: Descripción del uso (opcional)
 *                 example: "Entrada gimnasio"
 *           examples:
 *             entrada:
 *               summary: Entrada al gimnasio
 *               value:
 *                 monto: 50.00
 *                 concepto: "Entrada gimnasio"
 *             clase:
 *               summary: Clase de spinning
 *               value:
 *                 monto: 75.00
 *                 concepto: "Clase spinning"
 *     responses:
 *       200:
 *         description: Saldo descontado exitosamente
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
 *                   example: "Saldo descontado exitosamente"
 *                 movimiento:
 *                   type: object
 *                   properties:
 *                     concepto:
 *                       type: string
 *                       example: "Entrada gimnasio"
 *                     montoDescontado:
 *                       type: number
 *                       example: 50.00
 *                     saldoAnterior:
 *                       type: number
 *                       example: 500.00
 *                     saldoNuevo:
 *                       type: number
 *                       example: 450.00
 *       400:
 *         description: Datos inválidos o saldo insuficiente
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
 *                   example: "Saldo insuficiente"
 *                 saldoActual:
 *                   type: number
 *                   example: 30.00
 *                 montoRequerido:
 *                   type: number
 *                   example: 50.00
 *       404:
 *         description: Tarjeta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.post("/nfc/descontar/:uid", descontarSaldo);

/**
 * @swagger
 * /api/tarjetas/nfc/recargar/{uid}:
 *   post:
 *     summary: Recargar saldo de tarjeta NFC (sin autenticación - para terminal de recarga)
 *     description: Agrega saldo a una tarjeta NFC. Endpoint público usado por terminales de recarga físicos
 *     tags: [Tarjetas]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: UID único de la tarjeta NFC física
 *         example: "A1B2C3D4E5F6"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - monto
 *             properties:
 *               monto:
 *                 type: number
 *                 description: Monto a recargar (debe ser mayor a 0)
 *                 example: 500.00
 *               metodoPago:
 *                 type: string
 *                 description: Método de pago utilizado (opcional)
 *                 example: "EFECTIVO"
 *                 enum: [EFECTIVO, TARJETA_DEBITO, TARJETA_CREDITO, TRANSFERENCIA]
 *     responses:
 *       200:
 *         description: Saldo recargado exitosamente
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
 *                   example: "Saldo recargado exitosamente"
 *                 movimiento:
 *                   type: object
 *                   properties:
 *                     concepto:
 *                       type: string
 *                       example: "Recarga de saldo"
 *                     montoRecargado:
 *                       type: number
 *                       example: 500.00
 *                     metodoPago:
 *                       type: string
 *                       example: "EFECTIVO"
 *                     saldoAnterior:
 *                       type: number
 *                       example: 150.00
 *                     saldoNuevo:
 *                       type: number
 *                       example: 650.00
 *       400:
 *         description: Datos inválidos (monto debe ser mayor a 0)
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
 *                   example: "El monto debe ser mayor a 0"
 *       404:
 *         description: Tarjeta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.post("/nfc/recargar/:uid", recargarSaldo);

/**
 * @swagger
 * /api/tarjetas/nfc/buscar/{uid}:
 *   get:
 *     summary: Buscar tarjeta por UID (administrativo)
 *     description: Busca una tarjeta por su UID de NFC. Requiere autenticación y permisos de administrador
 *     tags: [Tarjetas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: UID único de la tarjeta NFC física
 *         example: "A1B2C3D4E5F6"
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
 *                   example: "Tarjeta encontrada"
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Tarjeta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get("/nfc/buscar/:uid", authenticate, authorizeAdmin, buscarPorUID);

module.exports = router;
