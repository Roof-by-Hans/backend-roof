const express = require("express");
const router = express.Router();
const {
  getTarjetas,
  getTarjetaPorId,
  getTarjetaPorUUID,
  crearTarjeta,
  actualizarTarjeta,
  eliminarTarjeta,
  actualizarSaldo,
  regenerarUUID,
  emitirTarjeta,
  verificarLectorRFID,
  leerTarjetaRFID,
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
 *         - idTipoSuscripcion
 *         - uuid
 *       properties:
 *         uuid:
 *           type: string
 *           description: UID físico leído desde el lector RFID (en mayúsculas). Se obtiene llamando a /api/rfid/scan
 *           example: "A1B2C3D4"
 *         idTipoSuscripcion:
 *           type: integer
 *           description: |
 *             ID del tipo de suscripción:
 *             - 1 = PREPAGA (pre pago y punto, NO tienen nivel de suscripción)
 *             - 2 = CREDITO (DEBEN tener nivel, jamás tienen saldo cargado, dependen del límite del nivel)
 *           example: 1
 *         idNivelSuscripcion:
 *           type: integer
 *           description: |
 *             ID del nivel de suscripción.
 *             - REQUERIDO para tarjetas de CREDITO
 *             - NO se usa para tarjetas PREPAGA
 *           example: 2
 *         saldoActual:
 *           type: number
 *           format: decimal
 *           description: |
 *             Saldo inicial (opcional, por defecto 0.00).
 *             Solo aplicable para tarjetas PREPAGA.
 *             Las tarjetas CREDITO no tienen saldo.
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
router.get("/", /*authenticate, authorizeAdmin,*/ getTarjetas);
/**
 * @swagger
 * /api/tarjetas:
 *   post:
 *     summary: Crear una tarjeta con UUID manual
 *     description: |
 *       Crea una nueva tarjeta proporcionando el UUID manualmente.
 *       **Nota:** Para emitir tarjetas usando el lector RFID, usa el endpoint POST /api/tarjetas/emitir
 *     tags: [Tarjetas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uuid
 *               - idTipoSuscripcion
 *             properties:
 *               uuid:
 *                 type: string
 *                 description: UUID de la tarjeta (debe ser único)
 *                 example: "A1B2C3D4"
 *               idTipoSuscripcion:
 *                 type: integer
 *                 description: ID del tipo de suscripción (1=PREPAGA, 2=CREDITO)
 *                 example: 1
 *               idNivelSuscripcion:
 *                 type: integer
 *                 description: ID del nivel de suscripción (requerido para CREDITO)
 *                 example: 1
 *               saldoActual:
 *                 type: number
 *                 format: double
 *                 description: Saldo inicial (solo para PREPAGA, CREDITO siempre inicia en 0)
 *                 example: 100.00
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
 *         description: Error de validación o datos faltantes
 *       409:
 *         description: El UUID ya está registrado en el sistema
 *       500:
 *         description: Error interno del servidor
 */
// router.post("/", authenticate, authorizeAdmin, crearTarjeta);
router.post("/", crearTarjeta); // SIN AUTH PARA PRUEBAS

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
router.get("/:id", /*authenticate, authorizeAdmin,*/ getTarjetaPorId);

/**
 * @swagger
 * /api/tarjetas/uuid/{uuid}:
 *   get:
 *     summary: Obtener tarjeta por UUID
 *     description: Obtiene la información completa de una tarjeta mediante su UUID (RFID)
 *     tags: [Tarjetas]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de la tarjeta RFID
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
 *                 data:
 *                   $ref: '#/components/schemas/Tarjeta'
 *                 message:
 *                   type: string
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
router.get("/uuid/:uuid", /*authenticate, authorizeAdmin,*/ getTarjetaPorUUID);

/**
 * @swagger
 * /api/tarjetas:
 *   post:
 *     summary: Crear una nueva tarjeta
 *     description: |
 *       Registra una nueva tarjeta física en el sistema.
 *       El UUID se genera automáticamente (UUID v4) y es único para cada tarjeta.
 *       
 *       **Importante:**
 *       - Las tarjetas PREPAGA NO tienen nivel de suscripción.
 *       - Las tarjetas CREDITO DEBEN tener nivel y jamás tienen saldo cargado.
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
 *             tarjetaCreditoConNivel:
 *               summary: Tarjeta CREDITO con nivel específico
 *               value:
 *                 idTipoSuscripcion: 2
 *                 idNivelSuscripcion: 3
 *             tarjetaPrepagaConSaldo:
 *               summary: Tarjeta PREPAGA con saldo inicial
 *               value:
 *                 idTipoSuscripcion: 1
 *                 saldoActual: 1000.00
 *             tarjetaPrepagaSinSaldo:
 *               summary: Tarjeta PREPAGA sin saldo inicial
 *               value:
 *                 idTipoSuscripcion: 1
 *                 saldoActual: 0
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
 *           - Tipo de suscripción requerido
 *           - Saldo inválido (debe ser >= 0)
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
 *                   example: "El tipo de suscripción es requerido"
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos (requiere rol admin)
 *       404:
 *         description: Tipo o nivel de suscripción no encontrado

 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// router.post("/", authenticate, authorizeAdmin, crearTarjeta); // DUPLICADO
// router.post("/", crearTarjeta); // YA ESTÁ DEFINIDO ARRIBA

/**
 * @swagger
 * /api/tarjetas/{id}:
 *   put:
 *     summary: Actualizar una tarjeta
 *     description: |
 *       Actualiza los datos de una tarjeta existente.
 *       Nota: Para modificar el UUID utilice el endpoint específico regenerar-uuid.
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

/**
 * @swagger
 * /api/tarjetas/{id}/regenerar-uuid:
 *   patch:
 *     summary: Regenerar UUID de una tarjeta
 *     description: |
 *       Genera un nuevo UUID v4 para una tarjeta existente.
 *       Esta función está destinada para casos especiales de mantenimiento.
 *       ⚠️ PRECAUCIÓN: Al cambiar el UUID, la tarjeta física anterior quedará desvinculada.
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
 *     responses:
 *       200:
 *         description: UUID regenerado exitosamente
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
 *                   example: "UUID regenerado exitosamente"
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
router.patch(
  "/:id/regenerar-uuid",
  authenticate,
  authorizeAdmin,
  regenerarUUID
);

/**
 * @swagger
 * /api/tarjetas/emitir:
 *   post:
 *     summary: 🎴 Emitir tarjeta con lector RFID automático
 *     description: |
 *       **Este es el endpoint principal para emitir tarjetas físicas.**
 *
 *       Flujo de trabajo:
 *       1. Se envían los datos de la tarjeta (tipo, nivel, saldo)
 *       2. El backend activa el lector RFID automáticamente
 *       3. El sistema espera 30 segundos a que acerques la tarjeta al lector
 *       4. Se captura el UID de la tarjeta física
 *       5. Se verifica que no esté duplicada
 *       6. Se registra en el sistema con el UID leído
 *
 *       **No necesitas enviar el UUID**, el lector lo captura automáticamente.
 *     tags: [Tarjetas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idTipoSuscripcion
 *             properties:
 *               idTipoSuscripcion:
 *                 type: integer
 *                 description: ID del tipo de suscripción (1=PREPAGA, 2=CREDITO)
 *                 example: 1
 *               idNivelSuscripcion:
 *                 type: integer
 *                 description: ID del nivel de suscripción (requerido para CREDITO)
 *                 example: 1
 *               saldoActual:
 *                 type: number
 *                 format: double
 *                 description: Saldo inicial (solo para PREPAGA, CREDITO siempre inicia en 0)
 *                 example: 100.00
 *     responses:
 *       201:
 *         description: Tarjeta emitida y registrada exitosamente
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
 *                   example: "Tarjeta emitida y registrada exitosamente"
 *       400:
 *         description: Datos inválidos o falta información requerida
 *       408:
 *         description: Tiempo de espera agotado, no se detectó tarjeta
 *       409:
 *         description: La tarjeta física ya está registrada
 *       500:
 *         description: Error interno del servidor
 */
router.post("/emitir", authenticate, authorizeAdmin, emitirTarjeta);

/**
 * @swagger
 * /api/tarjetas/rfid/verificar:
 *   get:
 *     summary: Verificar estado del lector RFID
 *     description: Retorna el estado actual del lector RFID (disponible, conectando, puerto)
 *     tags: [Tarjetas]
 *     responses:
 *       200:
 *         description: Estado del lector RFID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     disponible:
 *                       type: boolean
 *                       example: true
 *                     conectando:
 *                       type: boolean
 *                       example: false
 *                     puerto:
 *                       type: string
 *                       example: "/dev/ttyUSB0"
 *                 message:
 *                   type: string
 *                   example: "Lector RFID disponible"
 *       500:
 *         description: Error al verificar el lector
 */
router.get("/rfid/verificar", verificarLectorRFID);

/**
 * @swagger
 * /api/tarjetas/rfid/leer:
 *   get:
 *     summary: Leer una tarjeta RFID sin registrarla
 *     description: Activa el lector RFID, espera 30 segundos a que se pase una tarjeta y retorna el UID. También indica si la tarjeta ya está registrada en el sistema
 *     tags: [Tarjetas]
 *     responses:
 *       200:
 *         description: Tarjeta leída correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     uid:
 *                       type: string
 *                       example: "A1B2C3D4"
 *                     registrada:
 *                       type: boolean
 *                       example: true
 *                     tarjeta:
 *                       oneOf:
 *                         - $ref: '#/components/schemas/Tarjeta'
 *                         - type: null
 *                 message:
 *                   type: string
 *                   example: "Tarjeta leída correctamente"
 *       408:
 *         description: Tiempo de espera agotado, no se detectó tarjeta
 *       500:
 *         description: Error al leer la tarjeta
 */
router.get("/rfid/leer", leerTarjetaRFID);

module.exports = router;
