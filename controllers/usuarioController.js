const bcrypt = require("bcrypt");
const path = require("path");
const { promisePool } = require("../config/database");
const { mapUsuarioRow, mapUsuariosRows } = require("../helpers/usuarioMapper");
const {
  obtenerRolPorId,
  obtenerRolPorNombre,
  existeRolAsignado,
  eliminarRolAsignado,
  obtenerRolesUsuario,
} = require("../helpers/rolHelper");
const { deleteFile, getFileUrl } = require("../config/multer");
const { enviarError, enviarExito } = require("../helpers/responseHelpers");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

const hashPassword = async (password) => {
  if (!password) {
    throw new Error("La contraseña no puede estar vacía");
  }
  return bcrypt.hash(password, SALT_ROUNDS);
};

const normalizeActivo = (valor) => {
  if (valor === undefined || valor === null) return 1;
  if (typeof valor === "boolean") return valor ? 1 : 0;
  if (typeof valor === "string") {
    return valor === "1" || valor.toLowerCase() === "true" ? 1 : 0;
  }
  return Number(valor) ? 1 : 0;
};

const getUsuarios = async (req, res) => {
  try {
    const [rows] = await promisePool.execute(
      `SELECT u.id_usuario,
        u.nombre_usuario,
        u.activo,
        u.foto_perfil,
        GROUP_CONCAT(DISTINCT r.nombre ORDER BY r.nombre SEPARATOR ',') AS roles
       FROM Usuario u
       LEFT JOIN UsuarioRol ur ON ur.id_usuario = u.id_usuario
       LEFT JOIN Rol r ON r.id_rol = ur.id_rol
       GROUP BY u.id_usuario, u.nombre_usuario, u.activo, u.foto_perfil`
    );

    // Agregar URL completa de las imágenes de perfil
    const usuariosConImagenes = mapUsuariosRows(rows).map((usuario) => {
      if (usuario.fotoPerfil) {
        usuario.fotoPerfilUrl = getFileUrl(req, usuario.fotoPerfil, "usuarios");
      }
      return usuario;
    });

    return enviarExito(res, usuariosConImagenes, "Usuarios obtenidos correctamente");
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const getUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await promisePool.execute(
      `SELECT u.id_usuario,
        u.nombre_usuario,
        u.activo,
        u.foto_perfil,
        GROUP_CONCAT(DISTINCT r.nombre ORDER BY r.nombre SEPARATOR ',') AS roles
       FROM Usuario u
       LEFT JOIN UsuarioRol ur ON ur.id_usuario = u.id_usuario
       LEFT JOIN Rol r ON r.id_rol = ur.id_rol
       WHERE u.id_usuario = ?
       GROUP BY u.id_usuario, u.nombre_usuario, u.activo, u.foto_perfil`,
      [id]
    );

    if (rows.length === 0) {
      return enviarError(res, 404, "Usuario no encontrado");
    }

    const usuarioMapeado = mapUsuarioRow(rows[0]);
    if (usuarioMapeado.fotoPerfil) {
      usuarioMapeado.fotoPerfilUrl = getFileUrl(
        req,
        usuarioMapeado.fotoPerfil,
        "usuarios"
      );
    }

    return enviarExito(res, usuarioMapeado, "Usuario obtenido correctamente");
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const crearUsuario = async (req, res) => {
  try {
    const { nombreUsuario, contrasena, activo, roles } = req.body;
    const fotoPerfil = req.file ? req.file.filename : null; // Imagen subida con multer

    if (!nombreUsuario || !contrasena) {
      return enviarError(res, 400, "Los campos nombreUsuario y contrasena son obligatorios");
    }

    const activoNormalizado = normalizeActivo(activo);
    const hashedPassword = await hashPassword(contrasena);

    const [result] = await promisePool.execute(
      "INSERT INTO Usuario (nombre_usuario, contrasena, activo, foto_perfil) VALUES (?, ?, ?, ?)",
      [nombreUsuario, hashedPassword, activoNormalizado, fotoPerfil]
    );

    const userId = result.insertId;

    // Asignar roles si se proporcionaron
    if (roles && Array.isArray(roles) && roles.length > 0) {
      for (const nombreRol of roles) {
        const rol = await obtenerRolPorNombre(nombreRol);
        if (rol) {
          await promisePool.execute(
            "INSERT INTO UsuarioRol (id_usuario, id_rol) VALUES (?, ?)",
            [userId, rol.id_rol]
          );
        }
      }
    }

    // Obtener el usuario completo con roles
    const [rows] = await promisePool.execute(
      `SELECT u.id_usuario,
        u.nombre_usuario,
        u.activo,
        u.foto_perfil,
        GROUP_CONCAT(DISTINCT r.nombre ORDER BY r.nombre SEPARATOR ',') AS roles
       FROM Usuario u
       LEFT JOIN UsuarioRol ur ON ur.id_usuario = u.id_usuario
       LEFT JOIN Rol r ON r.id_rol = ur.id_rol
       WHERE u.id_usuario = ?
       GROUP BY u.id_usuario, u.nombre_usuario, u.activo, u.foto_perfil`,
      [userId]
    );

    const nuevoUsuario = mapUsuarioRow(rows[0]);

    if (nuevoUsuario.fotoPerfil) {
      nuevoUsuario.fotoPerfilUrl = getFileUrl(
        req,
        nuevoUsuario.fotoPerfil,
        "usuarios"
      );
    }

    return enviarExito(res, nuevoUsuario, "Usuario creado correctamente", 201);
  } catch (error) {
    console.error("Error al crear usuario:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return enviarError(res, 409, "El nombre de usuario ya está registrado");
    }

    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombreUsuario, contrasena, activo, roles } = req.body;

    // Obtener el usuario existente para manejar la imagen anterior
    const [usuarioExistente] = await promisePool.execute(
      "SELECT foto_perfil FROM Usuario WHERE id_usuario = ?",
      [id]
    );

    if (usuarioExistente.length === 0) {
      return enviarError(res, 404, "Usuario no encontrado");
    }

    const campos = [];
    const valores = [];

    if (nombreUsuario !== undefined) {
      campos.push("nombre_usuario = ?");
      valores.push(nombreUsuario);
    }

    if (contrasena !== undefined && contrasena !== null && contrasena !== "") {
      const hashedPassword = await hashPassword(contrasena);
      campos.push("contrasena = ?");
      valores.push(hashedPassword);
    }

    if (activo !== undefined) {
      campos.push("activo = ?");
      valores.push(normalizeActivo(activo));
    }

    // Manejar nueva imagen si se subió
    if (req.file) {
      // Si hay una imagen anterior, eliminarla
      if (usuarioExistente[0].foto_perfil) {
        const rutaImagenAnterior = path.join(
          __dirname,
          "..",
          "uploads",
          "usuarios",
          usuarioExistente[0].foto_perfil
        );
        await deleteFile(rutaImagenAnterior);
      }

      campos.push("foto_perfil = ?");
      valores.push(req.file.filename);
    } else if (
      req.body.eliminarFotoPerfil === "true" ||
      req.body.eliminarFotoPerfil === true
    ) {
      // Si se solicita eliminar la foto de perfil y no se subió una nueva
      if (usuarioExistente[0].foto_perfil) {
        const rutaImagenAnterior = path.join(
          __dirname,
          "..",
          "uploads",
          "usuarios",
          usuarioExistente[0].foto_perfil
        );
        await deleteFile(rutaImagenAnterior);
      }
      campos.push("foto_perfil = ?");
      valores.push(null);
    }

    // Actualizar roles si se proporcionaron
    if (roles !== undefined && Array.isArray(roles)) {
      // Eliminar roles existentes
      await promisePool.execute("DELETE FROM UsuarioRol WHERE id_usuario = ?", [
        id,
      ]);

      // Asignar nuevos roles
      if (roles.length > 0) {
        for (const nombreRol of roles) {
          const rol = await obtenerRolPorNombre(nombreRol);
          if (rol) {
            await promisePool.execute(
              "INSERT INTO UsuarioRol (id_usuario, id_rol) VALUES (?, ?)",
              [id, rol.id_rol]
            );
          }
        }
      }
    }

    if (campos.length === 0 && roles === undefined) {
      return enviarError(res, 400, "Debe enviar al menos un campo para actualizar");
    }

    if (campos.length > 0) {
      valores.push(id);

      const [result] = await promisePool.execute(
        `UPDATE Usuario SET ${campos.join(", ")} WHERE id_usuario = ?`,
        valores
      );

      if (result.affectedRows === 0) {
        return enviarError(res, 404, "Usuario no encontrado");
      }
    }

    const [rows] = await promisePool.execute(
      `SELECT u.id_usuario,
        u.nombre_usuario,
        u.activo,
        u.foto_perfil,
        GROUP_CONCAT(DISTINCT r.nombre ORDER BY r.nombre SEPARATOR ',') AS roles
       FROM Usuario u
       LEFT JOIN UsuarioRol ur ON ur.id_usuario = u.id_usuario
       LEFT JOIN Rol r ON r.id_rol = ur.id_rol
       WHERE u.id_usuario = ?
       GROUP BY u.id_usuario, u.nombre_usuario, u.activo, u.foto_perfil`,
      [id]
    );

    const usuarioActualizado = mapUsuarioRow(rows[0]);
    if (usuarioActualizado.fotoPerfil) {
      usuarioActualizado.fotoPerfilUrl = getFileUrl(
        req,
        usuarioActualizado.fotoPerfil,
        "usuarios"
      );
    }

    return enviarExito(res, usuarioActualizado, "Usuario actualizado correctamente");
  } catch (error) {
    console.error("Error al actualizar usuario:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return enviarError(res, 409, "El nombre de usuario ya está registrado");
    }

    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener la imagen del usuario antes de eliminarlo
    const [usuarioAEliminar] = await promisePool.execute(
      "SELECT foto_perfil FROM Usuario WHERE id_usuario = ?",
      [id]
    );

    if (usuarioAEliminar.length === 0) {
      return enviarError(res, 404, "Usuario no encontrado");
    }

    // Eliminar primero los roles del usuario (foreign key constraint)
    await promisePool.execute("DELETE FROM UsuarioRol WHERE id_usuario = ?", [
      id,
    ]);

    // Ahora eliminar el usuario
    const [result] = await promisePool.execute(
      "DELETE FROM Usuario WHERE id_usuario = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return enviarError(res, 404, "Usuario no encontrado");
    }

    // Eliminar la imagen asociada si existe
    if (usuarioAEliminar[0].foto_perfil) {
      const rutaImagen = path.join(
        __dirname,
        "..",
        "uploads",
        "usuarios",
        usuarioAEliminar[0].foto_perfil
      );
      await deleteFile(rutaImagen);
    }

    return enviarExito(res, null, "Usuario eliminado correctamente");
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const asignarRolUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { roles, idRol, nombreRol } = req.body || {};

    const rolesSolicitados = Array.isArray(roles)
      ? roles
      : idRol || nombreRol
      ? [{ idRol, nombreRol }]
      : [];

    if (!Array.isArray(rolesSolicitados) || rolesSolicitados.length === 0) {
      return enviarError(
        res,
        400,
        "Debe proporcionar al menos un rol a asignar (roles[], idRol o nombreRol)"
      );
    }

    const [usuarios] = await promisePool.execute(
      `SELECT id_usuario, nombre_usuario, activo
       FROM Usuario
       WHERE id_usuario = ?`,
      [id]
    );

    if (usuarios.length === 0) {
      return enviarError(res, 404, "Usuario no encontrado");
    }

    const normalizados = [];
    const entradasInvalidas = [];

    rolesSolicitados.forEach((entrada, index) => {
      let idEntrada = null;
      let nombreEntrada = null;

      if (typeof entrada === "number") {
        idEntrada = entrada;
      } else if (typeof entrada === "string") {
        nombreEntrada = entrada;
      } else if (entrada && typeof entrada === "object") {
        idEntrada = entrada.idRol ?? entrada.id;
        nombreEntrada = entrada.nombreRol ?? entrada.nombre;
      }

      if (!idEntrada && !nombreEntrada) {
        entradasInvalidas.push({ index, valor: entrada });
      } else {
        normalizados.push({ idRol: idEntrada, nombreRol: nombreEntrada });
      }
    });

    if (normalizados.length === 0) {
      return enviarError(
        res,
        400,
        "Los roles enviados no contienen información válida"
      );
    }

    if (entradasInvalidas.length > 0) {
      return enviarError(res, 400, "Algunas entradas de rol son inválidas", {
        detalles: entradasInvalidas,
      });
    }

    const rolesEncontrados = [];
    const rolesNoEncontrados = [];
    const idsProcesados = new Set();

    for (const entrada of normalizados) {
      let rol = null;

      if (entrada.idRol) {
        rol = await obtenerRolPorId(entrada.idRol);
      } else if (entrada.nombreRol) {
        rol = await obtenerRolPorNombre(entrada.nombreRol);
      }

      if (!rol) {
        rolesNoEncontrados.push(entrada);
        continue;
      }

      if (!idsProcesados.has(rol.id_rol)) {
        idsProcesados.add(rol.id_rol);
        rolesEncontrados.push(rol);
      }
    }

    if (rolesEncontrados.length === 0) {
      return enviarError(
        res,
        404,
        "Ninguno de los roles proporcionados fue encontrado",
        { detalles: rolesNoEncontrados }
      );
    }

    if (rolesNoEncontrados.length > 0) {
      return enviarError(res, 404, "Algunos roles no fueron encontrados", {
        detalles: rolesNoEncontrados,
      });
    }

    const rolesYaAsignados = [];

    for (const rol of rolesEncontrados) {
      const yaAsignado = await existeRolAsignado(id, rol.id_rol);
      if (yaAsignado) {
        rolesYaAsignados.push(rol);
      }
    }

    if (rolesYaAsignados.length > 0) {
      return enviarError(
        res,
        409,
        "Uno o más roles ya se encuentran asignados al usuario",
        {
          detalles: rolesYaAsignados.map((rol) => ({
            idRol: rol.id_rol,
            nombreRol: rol.nombre,
          })),
        }
      );
    }

    for (const rol of rolesEncontrados) {
      await promisePool.execute(
        `INSERT INTO UsuarioRol (id_usuario, id_rol)
         VALUES (?, ?)`,
        [id, rol.id_rol]
      );
    }

    const rolesActualizados = await obtenerRolesUsuario(id);
    const usuarioMapeado = mapUsuarioRow({
      ...usuarios[0],
      roles: rolesActualizados.map((r) => r.nombre),
    });

    return enviarExito(
      res,
      {
        usuario: usuarioMapeado,
        rolesAsignados: rolesEncontrados.map((rol) => rol.nombre),
      },
      rolesEncontrados.length > 1
        ? "Roles asignados correctamente"
        : "Rol asignado correctamente",
      201
    );
  } catch (error) {
    console.error("Error al asignar rol:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

const removerRolesUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { roles, idRol, nombreRol } = req.body || {};

    const rolesSolicitados = Array.isArray(roles)
      ? roles
      : idRol || nombreRol
      ? [{ idRol, nombreRol }]
      : [];

    if (!Array.isArray(rolesSolicitados) || rolesSolicitados.length === 0) {
      return enviarError(
        res,
        400,
        "Debe proporcionar al menos un rol a remover (roles[], idRol o nombreRol)"
      );
    }

    const [usuarios] = await promisePool.execute(
      `SELECT id_usuario, nombre_usuario, activo
       FROM Usuario
       WHERE id_usuario = ?`,
      [id]
    );

    if (usuarios.length === 0) {
      return enviarError(res, 404, "Usuario no encontrado");
    }

    const normalizados = [];
    const entradasInvalidas = [];

    rolesSolicitados.forEach((entrada, index) => {
      let idEntrada = null;
      let nombreEntrada = null;

      if (typeof entrada === "number") {
        idEntrada = entrada;
      } else if (typeof entrada === "string") {
        nombreEntrada = entrada;
      } else if (entrada && typeof entrada === "object") {
        idEntrada = entrada.idRol ?? entrada.id;
        nombreEntrada = entrada.nombreRol ?? entrada.nombre;
      }

      if (!idEntrada && !nombreEntrada) {
        entradasInvalidas.push({ index, valor: entrada });
      } else {
        normalizados.push({ idRol: idEntrada, nombreRol: nombreEntrada });
      }
    });

    if (normalizados.length === 0) {
      return enviarError(
        res,
        400,
        "Los roles enviados no contienen información válida",
        { detalles: entradasInvalidas }
      );
    }

    if (entradasInvalidas.length > 0) {
      return enviarError(res, 400, "Algunas entradas de rol son inválidas", {
        detalles: entradasInvalidas,
      });
    }

    const rolesEncontrados = [];
    const rolesNoEncontrados = [];
    const idsProcesados = new Set();

    for (const entrada of normalizados) {
      let rol = null;

      if (entrada.idRol) {
        rol = await obtenerRolPorId(entrada.idRol);
      } else if (entrada.nombreRol) {
        rol = await obtenerRolPorNombre(entrada.nombreRol);
      }

      if (!rol) {
        rolesNoEncontrados.push(entrada);
        continue;
      }

      if (!idsProcesados.has(rol.id_rol)) {
        idsProcesados.add(rol.id_rol);
        rolesEncontrados.push(rol);
      }
    }

    if (rolesEncontrados.length === 0) {
      return enviarError(
        res,
        404,
        "Ninguno de los roles proporcionados fue encontrado",
        { detalles: rolesNoEncontrados }
      );
    }

    if (rolesNoEncontrados.length > 0) {
      return enviarError(res, 404, "Algunos roles no fueron encontrados", {
        detalles: rolesNoEncontrados,
      });
    }

    const rolesNoAsignados = [];

    for (const rol of rolesEncontrados) {
      const yaAsignado = await existeRolAsignado(id, rol.id_rol);
      if (!yaAsignado) {
        rolesNoAsignados.push(rol);
      }
    }

    if (rolesNoAsignados.length > 0) {
      return enviarError(
        res,
        409,
        "Uno o más roles no están asignados al usuario",
        {
          detalles: rolesNoAsignados.map((rol) => ({
            idRol: rol.id_rol,
            nombreRol: rol.nombre,
          })),
        }
      );
    }

    for (const rol of rolesEncontrados) {
      await eliminarRolAsignado(id, rol.id_rol);
    }

    const rolesActualizados = await obtenerRolesUsuario(id);
    const usuarioMapeado = mapUsuarioRow({
      ...usuarios[0],
      roles: rolesActualizados.map((r) => r.nombre),
    });

    return enviarExito(
      res,
      {
        usuario: usuarioMapeado,
        rolesRemovidos: rolesEncontrados.map((rol) => rol.nombre),
      },
      rolesEncontrados.length > 1
        ? "Roles removidos correctamente"
        : "Rol removido correctamente"
    );
  } catch (error) {
    console.error("Error al remover rol:", error);
    return enviarError(res, 500, "Error interno del servidor", {
      error: error.message,
    });
  }
};

module.exports = {
  getUsuarios,
  getUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  asignarRolUsuario,
  removerRolesUsuario,
};
