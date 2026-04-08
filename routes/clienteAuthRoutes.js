const express = require("express");
const {
  getPerfilCliente,
  getResumenCuenta,
  getMovimientos,
  getFacturas,
  actualizarPerfil,
  cambiarContrasena,
  actualizarFoto,
  eliminarFoto,
} = require("../controllers/clienteAuthController");
const authClienteMiddleware = require("../middlewares/authClienteMiddleware");
const { uploadClient, handleMulterError } = require("../config/multer");

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
 * /api/auth-cliente/me:
 *   put:
 *     summary: Actualizar perfil del cliente autenticado
 *     description: Permite al cliente actualizar su nombre, apellido, teléfono y preferencias
 *     tags: [Cliente Autenticado]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Juan
 *               apellido:
 *                 type: string
 *                 example: Pérez
 *               telefono:
 *                 type: string
 *                 example: "+54 11 1234-5678"
 *               preferencias:
 *                 type: string
 *                 example: "Tema oscuro, notificaciones activadas"
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
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
 *                   example: Perfil actualizado exitosamente
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
 *                     preferencias:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token no proporcionado o inválido
 *       404:
 *         description: Cliente no encontrado
 */
router.put("/me", authClienteMiddleware, actualizarPerfil);

/**
 * @swagger
 * /api/auth-cliente/contrasena:
 *   put:
 *     summary: Cambiar contraseña del cliente
 *     description: Permite al cliente cambiar su contraseña proporcionando la actual y la nueva
 *     tags: [Cliente Autenticado]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contrasenaActual
 *               - contrasenaNueva
 *             properties:
 *               contrasenaActual:
 *                 type: string
 *                 format: password
 *                 example: miPasswordActual123
 *               contrasenaNueva:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: miNuevoPassword456
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
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
 *                   example: Contraseña actualizada exitosamente
 *       400:
 *         description: Datos inválidos o contraseña nueva muy corta
 *       401:
 *         description: Contraseña actual incorrecta o token inválido
 *       404:
 *         description: Cliente no encontrado
 */
router.put("/contrasena", authClienteMiddleware, cambiarContrasena);

/**
 * @swagger
 * /api/auth-cliente/foto:
 *   put:
 *     summary: Actualizar foto de perfil del cliente
 *     description: Permite al cliente subir o cambiar su foto de perfil
 *     tags: [Cliente Autenticado]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               foto:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de imagen (jpg, jpeg, png)
 *     responses:
 *       200:
 *         description: Foto actualizada exitosamente
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
 *                   example: Foto de perfil actualizada exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     fotoPerfil:
 *                       type: string
 *                       example: cliente-1234567890-abc123.jpg
 *                     fotoPerfilUrl:
 *                       type: string
 *                       example: http://localhost:3000/uploads/clientes/cliente-1234567890-abc123.jpg
 *       400:
 *         description: No se proporcionó imagen o formato inválido
 *       401:
 *         description: Token no proporcionado o inválido
 *       404:
 *         description: Cliente no encontrado
 */
router.put(
  "/foto",
  authClienteMiddleware,
  uploadClient.single("foto"),
  handleMulterError,
  actualizarFoto
);

/**
 * @swagger
 * /api/auth-cliente/foto:
 *   delete:
 *     summary: Eliminar foto de perfil del cliente
 *     description: Permite al cliente eliminar su foto de perfil
 *     tags: [Cliente Autenticado]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Foto eliminada exitosamente
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
 *                   example: Foto de perfil eliminada exitosamente
 *       400:
 *         description: El cliente no tiene foto de perfil
 *       401:
 *         description: Token no proporcionado o inválido
 *       404:
 *         description: Cliente no encontrado
 */
router.delete("/foto", authClienteMiddleware, eliminarFoto);

/**
 * @swagger
 * /api/auth-cliente/resumen:
 *   get:
 *     summary: Obtener resumen de cuenta del cliente
 *     description: Retorna el saldo actual y, para clientes CREDITO, informacion de limite mensual
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
 *                     totalConsumos:
 *                       type: number
 *                       example: 12500
 *                     totalPagos:
 *                       type: number
 *                       example: 5000
 *                     ultimoMovimiento:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     estadoTarjeta:
 *                       type: string
 *                       nullable: true
 *                     tipoSuscripcion:
 *                       type: string
 *                       nullable: true
 *                       example: CREDITO
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
 *                     limiteTotal:
 *                       type: number
 *                       example: 50000
 *                     consumidoMes:
 *                       type: number
 *                       example: 18200
 *                     limiteRestante:
 *                       type: number
 *                       example: 31800
 *                     periodo:
 *                       type: object
 *                       properties:
 *                         anio:
 *                           type: integer
 *                           example: 2026
 *                         mes:
 *                           type: integer
 *                           example: 4
 *                         inicio:
 *                           type: string
 *                           format: date-time
 *                           example: 2026-04-01T03:00:00.000Z
 *                         fin:
 *                           type: string
 *                           format: date-time
 *                           example: 2026-05-01T02:59:59.999Z
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
