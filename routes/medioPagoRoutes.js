const express = require("express");
const router = express.Router();
const { obtenerMediosPago } = require("../controllers/medioPagoController");
const { authenticate } = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: MediosPago
 *   description: Endpoints para gestionar medios de pago
 */

/**
 * @swagger
 * /api/medios-pago:
 *   get:
 *     summary: Obtener lista de medios de pago
 *     tags: [MediosPago]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de medios de pago obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_medio_pago:
 *                         type: integer
 *                       nombre:
 *                         type: string
 */
router.get("/", authenticate, obtenerMediosPago);

module.exports = router;
