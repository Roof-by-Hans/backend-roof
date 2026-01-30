const express = require("express");
const {
  getPerfilCliente,
  getResumenCuenta,
  getMovimientos,
  getFacturas,
} = require("../controllers/clienteAuthController");
const authClienteMiddleware = require("../middlewares/authClienteMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Cliente Autenticado
 *   description: Endpoints para clientes autenticados (requieren token de cliente)
 */

/**
 * @swagger
 * /api/auth-cliente/me:
 *   get:
 *     summary: Obtener perfil completo del cliente autenticado
 *     description: Retorna la información completa del cliente incluyendo nivel de suscripción, tipo y datos de tarjeta
 *     tags: [Cliente Autenticado]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del cliente obtenido exitosamente
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
 *                     id:
 *                       type: integer
 *                     nombre:
 *                       type: string
 *                     apellido:
 *                       type: string
 *                     email:
 *                       type: string
 *                     telefono:
 *                       type: string
 *                     fotoPerfil:
 *                       type: string
 *                       nullable: true
 *                     saldoActual:
 *                       type: number
 *                     nivelSuscripcion:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: integer
 *                         nombre:
 *                           type: string
 *                     tipoSuscripcion:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: integer
 *                         tipo:
 *                           type: string
 *                     tarjeta:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: integer
 *                         uuid:
 *                           type: string
 *                         saldoActual:
 *                           type: number
 *                         estado:
 *                           type: string
 *                         fechaCreacion:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Token no proporcionado o inválido
 *       404:
 *         description: Cliente no encontrado
 */
router.get("/me", authClienteMiddleware, getPerfilCliente);

/**
 * @swagger
 * /api/auth-cliente/resumen:
 *   get:
 *     summary: Obtener resumen de cuenta del cliente
 *     description: Retorna el saldo actual, límite de crédito, total de movimientos y totales agrupados por tipo
 *     tags: [Cliente Autenticado]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen de cuenta obtenido exitosamente
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
 *                     saldoActual:
 *                       type: number
 *                     estadoTarjeta:
 *                       type: string
 *                       nullable: true
 *                     totalMovimientos:
 *                       type: integer
 *                     totalesPorTipo:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tipo:
 *                             type: string
 *                           cantidad:
 *                             type: integer
 *                           total:
 *                             type: number
 *       401:
 *         description: Token no proporcionado o inválido
 */
router.get("/resumen", authClienteMiddleware, getResumenCuenta);

/**
 * @swagger
 * /api/auth-cliente/movimientos:
 *   get:
 *     summary: Obtener historial de movimientos del cliente
 *     description: Retorna los movimientos de cuenta con paginación
 *     tags: [Cliente Autenticado]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de registros por página
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Desplazamiento para paginación
 *     responses:
 *       200:
 *         description: Movimientos obtenidos exitosamente
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
 *                       id:
 *                         type: integer
 *                       fecha:
 *                         type: string
 *                         format: date-time
 *                       monto:
 *                         type: number
 *                       tipoMovimiento:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: integer
 *                           nombre:
 *                             type: string
 *                       observaciones:
 *                         type: string
 *                       factura:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: integer
 *                           total:
 *                             type: number
 *                           estado:
 *                             type: string
 *                             enum: [PENDIENTE, COBRADA, ANULADA]
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Token no proporcionado o inválido
 */
router.get("/movimientos", authClienteMiddleware, getMovimientos);

/**
 * @swagger
 * /api/auth-cliente/facturas:
 *   get:
 *     summary: Obtener facturas del cliente
 *     description: Retorna las facturas con filtros opcionales por estado
 *     tags: [Cliente Autenticado]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [PENDIENTE, COBRADA, ANULADA]
 *         description: Filtrar por estado de factura
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de registros por página
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Desplazamiento para paginación
 *     responses:
 *       200:
 *         description: Facturas obtenidas exitosamente
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
 *                       id:
 *                         type: integer
 *                       fecha:
 *                         type: string
 *                         format: date-time
 *                       total:
 *                         type: number
 *                       estado:
 *                         type: string
 *                         enum: [PENDIENTE, COBRADA, ANULADA]
 *                       idMesa:
 *                         type: integer
 *                         nullable: true
 *                       idGrupo:
 *                         type: integer
 *                         nullable: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Token no proporcionado o inválido
 */
router.get("/facturas", authClienteMiddleware, getFacturas);

module.exports = router;
