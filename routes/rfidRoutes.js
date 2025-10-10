const express = require("express");
const router = express.Router();
const { scan, verificar } = require("../controllers/rfidController");
const {
  authenticate,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: RFID
 *   description: Operaciones con lector RFID físico
 */

/**
 * @swagger
 * /api/rfid/scan:
 *   post:
 *     summary: Escanear una tarjeta física con el lector RFID
 *     description: Espera hasta un tiempo máximo a que se apoye una tarjeta sobre el lector y devuelve su UID en hexadecimal.
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timeoutMs:
 *                 type: integer
 *                 default: 10000
 *                 description: Tiempo máximo de espera en milisegundos.
 *     responses:
 *       200:
 *         description: Tarjeta detectada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     uid:
 *                       type: string
 *                       example: "A1B2C3D4"
 *                 message:
 *                   type: string
 *       504:
 *         description: No se detectó la tarjeta dentro del tiempo de espera o el lector no está disponible
 */
// Escanear una tarjeta (bloquea hasta timeout)
// router.post("/scan", authenticate, authorizeAdmin, scan);
router.post("/scan", scan); // SIN AUTH PARA PRUEBAS

/**
 * @swagger
 * /api/rfid/verificar:
 *   post:
 *     summary: Verificar si un UID de tarjeta ya existe en el sistema
 *     tags: [RFID]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rfidUid
 *             properties:
 *               rfidUid:
 *                 type: string
 *                 description: UID de la tarjeta en hexadecimal (por ejemplo devuelto por /api/rfid/scan)
 *                 example: "A1B2C3D4"
 *     responses:
 *       200:
 *         description: Tarjeta encontrada
 *       404:
 *         description: Tarjeta no encontrada
 */
// Verificar una tarjeta por UID
// router.post("/verificar", authenticate, authorizeAdmin, verificar);
router.post("/verificar", verificar); // SIN AUTH PARA PRUEBAS

module.exports = router;
