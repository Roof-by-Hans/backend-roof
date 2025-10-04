const express = require("express");
const router = express.Router();
const {
  getUsuarios,
  getUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  asignarRolUsuario,
  removerRolesUsuario,
} = require("../controllers/usuarioController");
const {
  authenticate,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Endpoints para gestionar usuarios del sistema
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       required:
 *         - id
 *         - nombreUsuario
 *         - activo
 *         - roles
 *       properties:
 *         id:
 *           type: integer
 *           description: Identificador único del usuario en la base de datos
 *           example: 1
 *         nombreUsuario:
 *           type: string
 *           description: Nombre utilizado para iniciar sesión (debe ser único)
 *           example: hans123
 *         activo:
 *           type: boolean
 *           description: Indica si el usuario puede autenticarse en el sistema
 *           example: true
 *         roles:
 *           type: array
 *           description: Conjunto de roles legibles asociados al usuario
 *           items:
 *             type: string
 *           example:
 *             - Administrador
 *             - Supervisor
 *     UsuarioListResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Usuarios obtenidos correctamente
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Usuario'
 *       example:
 *         success: true
 *         message: Usuarios obtenidos correctamente
 *         data:
 *           - id: 1
 *             nombreUsuario: admin
 *             activo: true
 *             roles:
 *               - Administrador
 *           - id: 2
 *             nombreUsuario: juan
 *             activo: false
 *             roles: []
 *     UsuarioDetailResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Usuario obtenido correctamente
 *         data:
 *           $ref: '#/components/schemas/Usuario'
 *       example:
 *         success: true
 *         message: Usuario obtenido correctamente
 *         data:
 *           id: 1
 *           nombreUsuario: admin
 *           activo: true
 *           roles:
 *             - Administrador
 *     MensajeResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Usuario eliminado correctamente
 *     UsuarioMutationResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/UsuarioDetailResponse'
 *       example:
 *         success: true
 *         message: Usuario creado correctamente
 *         data:
 *           id: 5
 *           nombreUsuario: maria
 *           activo: true
 *           roles: []
 *     AsignarRolItem:
 *       type: object
 *       properties:
 *         idRol:
 *           type: integer
 *           description: Identificador numérico del rol
 *           example: 1
 *         nombreRol:
 *           type: string
 *           description: Nombre legible del rol
 *           example: Administrador
 *       oneOf:
 *         - required:
 *             - idRol
 *         - required:
 *             - nombreRol
 *       description: Permite referenciar un rol por identificador o por nombre
 *     AsignarRolesRequest:
 *       type: object
 *       description: Cuerpo permitido para asignar uno o varios roles a un usuario
 *       properties:
 *         roles:
 *           type: array
 *           minItems: 1
 *           items:
 *             $ref: '#/components/schemas/AsignarRolItem'
 *           description: Lista de roles a asignar en un único request
 *         idRol:
 *           type: integer
 *           description: Forma abreviada para asignar un único rol por identificador
 *           example: 2
 *         nombreRol:
 *           type: string
 *           description: Forma abreviada para asignar un único rol por nombre
 *           example: Supervisor
 *       anyOf:
 *         - required:
 *             - roles
 *         - required:
 *             - idRol
 *         - required:
 *             - nombreRol
 *       example:
 *         roles:
 *           - idRol: 1
 *           - nombreRol: "Supervisor"
 *     RemoverRolesRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/AsignarRolesRequest'
 *       description: Se utiliza la misma estructura que la asignación para indicar los roles a remover
 *     AsignarRolesResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Roles asignados correctamente
 *         data:
 *           type: object
 *           required:
 *             - usuario
 *             - rolesAsignados
 *           properties:
 *             usuario:
 *               $ref: '#/components/schemas/Usuario'
 *             rolesAsignados:
 *               type: array
 *               items:
 *                 type: string
 *               example:
 *                 - Administrador
 *                 - Supervisor
 *       example:
 *         success: true
 *         message: Roles asignados correctamente
 *         data:
 *           usuario:
 *             id: 1
 *             nombreUsuario: admin
 *             activo: true
 *             roles:
 *               - Administrador
 *               - Supervisor
 *           rolesAsignados:
 *             - Supervisor
 *     RemoverRolesResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Roles removidos correctamente
 *         data:
 *           type: object
 *           required:
 *             - usuario
 *             - rolesRemovidos
 *           properties:
 *             usuario:
 *               $ref: '#/components/schemas/Usuario'
 *             rolesRemovidos:
 *               type: array
 *               items:
 *                 type: string
 *               example:
 *                 - Supervisor
 *       example:
 *         success: true
 *         message: Roles removidos correctamente
 *         data:
 *           usuario:
 *             id: 1
 *             nombreUsuario: admin
 *             activo: true
 *             roles:
 *               - Administrador
 *           rolesRemovidos:
 *             - Supervisor
 *     CrearUsuarioRequest:
 *       type: object
 *       required:
 *         - nombreUsuario
 *         - contrasena
 *       properties:
 *         nombreUsuario:
 *           type: string
 *           description: Debe ser único dentro del sistema
 *           example: hans123
 *         contrasena:
 *           type: string
 *           description: Contraseña en texto plano que será hasheada
 *           example: MiContrasenaSegura123
 *         activo:
 *           type: boolean
 *           description: Estado inicial del usuario (true por defecto si se omite)
 *           example: true
 *     ActualizarUsuarioRequest:
 *       type: object
 *       description: Campos opcionales a actualizar; se puede enviar uno o varios
 *       properties:
 *         nombreUsuario:
 *           type: string
 *           example: hans123
 *         contrasena:
 *           type: string
 *           example: NuevaContrasena456
 *         activo:
 *           type: boolean
 *           example: false
 *     LoginRequest:
 *       type: object
 *       required:
 *         - nombreUsuario
 *         - contrasena
 *       properties:
 *         nombreUsuario:
 *           type: string
 *           example: admin
 *         contrasena:
 *           type: string
 *           example: MiContrasenaSegura123
 *     LoginResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Autenticación exitosa
 *         data:
 *           type: object
 *           required:
 *             - token
 *             - usuario
 *           properties:
 *             token:
 *               type: string
 *               description: JWT firmado necesario para invocar endpoints protegidos
 *               example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *             usuario:
 *               $ref: '#/components/schemas/Usuario'
 *       example:
 *         success: true
 *         message: Autenticación exitosa
 *         data:
 *           token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *           usuario:
 *             id: 1
 *             nombreUsuario: admin
 *             activo: true
 *             roles:
 *               - Administrador
 *     ErrorResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Error interno del servidor
 *         error:
 *           type: string
 *           description: Detalle técnico opcional
 *           example: ER_DUP_ENTRY
 *         detalles:
 *           type: array
 *           description: Lista opcional con información adicional sobre el error
 *           items:
 *             type: object
 *           example:
 *             - idRol: 5
 *               nombreRol: Auditor
 *   responses:
 *     BadRequestError:
 *       description: La solicitud contiene datos inválidos o incompletos
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: La petición contiene datos inválidos o faltantes
 *             detalles:
 *               - campo: nombreUsuario
 *                 error: "Este campo es obligatorio"
 *     UnauthorizedError:
 *       description: Token inválido, expirado o ausente
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: Token inválido o expirado
 *     ForbiddenError:
 *       description: El usuario autenticado no posee privilegios suficientes
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: No tiene permisos para realizar esta acción
 *     NotFoundError:
 *       description: El recurso solicitado no existe
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: Recurso no encontrado
 *     ConflictError:
 *       description: La operación no puede completarse por un conflicto con el estado actual
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: El recurso solicitado ya existe o está asociado
 *     InternalServerError:
 *       description: Error interno inesperado
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             message: Error interno del servidor
 *             error: Error al conectar con la base de datos
 */

/**
 * @swagger
 * /api/usuarios:
 *   get:
 *     summary: Obtener todos los usuarios
 *     description: Devuelve la lista completa de usuarios con sus roles agregados desde la tabla UsuarioRol.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuarios obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsuarioListResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/", authenticate, authorizeAdmin, getUsuarios);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   get:
 *     summary: Obtener un usuario por su ID
 *     description: Recupera un único usuario con sus roles. El identificador corresponde a la columna `id_usuario`.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador numérico del usuario objetivo
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsuarioDetailResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", authenticate, authorizeAdmin, getUsuarioPorId);

/**
 * @swagger
 * /api/usuarios:
 *   post:
 *     summary: Crear un nuevo usuario
 *     description: Registra un usuario en la tabla `Usuario`, hasheando la contraseña y aplicando el estado `activo` indicado.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearUsuarioRequest'
 *           examples:
 *             usuarioActivo:
 *               summary: Usuario activo por defecto
 *               value:
 *                 nombreUsuario: hans123
 *                 contrasena: MiContrasenaSegura123
 *             usuarioInactivo:
 *               summary: Usuario creado como inactivo
 *               value:
 *                 nombreUsuario: ana.garcia
 *                 contrasena: MiContrasenaSegura123
 *                 activo: false
 *     responses:
 *       201:
 *         description: Usuario creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsuarioMutationResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       409:
 *         description: El nombre de usuario ya está registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: El nombre de usuario ya está registrado
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/", authenticate, authorizeAdmin, crearUsuario);

/**
 * @swagger
 * /api/usuarios/{id}/roles:
 *   post:
 *     summary: Asignar uno o varios roles a un usuario
 *     description: Inserta registros en `UsuarioRol` evitando duplicados. Permite enviar un único rol o un arreglo con múltiples roles.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del usuario al que se asignarán los roles
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AsignarRolesRequest'
 *           examples:
 *             unicoPorNombre:
 *               summary: Asignar un rol por nombre
 *               value:
 *                 nombreRol: "Supervisor"
 *             multiplesMixtos:
 *               summary: Asignar varios roles mezclando id y nombre
 *               value:
 *                 roles:
 *                   - idRol: 1
 *                   - nombreRol: "Auditor"
 *     responses:
 *       201:
 *         description: Roles asignados correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AsignarRolesResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/:id/roles", authenticate, authorizeAdmin, asignarRolUsuario);

/**
 * @swagger
 * /api/usuarios/{id}/roles:
 *   delete:
 *     summary: Remover uno o varios roles de un usuario
 *     description: Elimina relaciones en `UsuarioRol` únicamente si los roles están actualmente asignados al usuario.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del usuario al que se le quitarán los roles
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RemoverRolesRequest'
 *           examples:
 *             porId:
 *               summary: Remover un rol por id
 *               value:
 *                 idRol: 3
 *             mixto:
 *               summary: Remover múltiples roles
 *               value:
 *                 roles:
 *                   - idRol: 1
 *                   - nombreRol: "Supervisor"
 *     responses:
 *       200:
 *         description: Roles removidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RemoverRolesResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Uno o más roles no están asignados al usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Uno o más roles no están asignados al usuario
 *               detalles:
 *                 - idRol: 4
 *                   nombreRol: Auditor
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete("/:id/roles", authenticate, authorizeAdmin, removerRolesUsuario);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   put:
 *     summary: Actualizar un usuario existente
 *     description: Permite modificar datos del usuario, aplicando hash si se cambia la contraseña.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del usuario a actualizar
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarUsuarioRequest'
 *           examples:
 *             cambiarNombre:
 *               summary: Modificar el nombre de usuario
 *               value:
 *                 nombreUsuario: hans.new
 *             resetPassword:
 *               summary: Actualizar contraseña y desactivar
 *               value:
 *                 contrasena: NuevaClave456
 *                 activo: false
 *     responses:
 *       200:
 *         description: Usuario actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsuarioMutationResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: El nombre de usuario ya está registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: El nombre de usuario ya está registrado
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put("/:id", authenticate, authorizeAdmin, actualizarUsuario);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   delete:
 *     summary: Eliminar un usuario
 *     description: Borra el registro del usuario y sus relaciones de roles mediante claves foráneas.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identificador del usuario que se desea eliminar
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensajeResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete("/:id", authenticate, authorizeAdmin, eliminarUsuario);

module.exports = router;
