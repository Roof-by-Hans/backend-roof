const bcrypt = require("bcrypt");
const path = require("path");
const { promisePool } = require("../config/database");
const { mapClienteRow, mapClientesRows } = require("../helpers/clienteMapper");
const { deleteFile, getFileUrl } = require("../config/multer");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

const hashPassword = async (password) => {
  if (!password) {
    throw new Error("La contraseña no puede estar vacía");
  }
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Obtener todos los clientes
 * @query {string} estado - Filtro por estado: 'habilitados' (default), 'deshabilitados', 'todos'
 */
const getClientes = async (req, res) => {
  try {
    const { estado } = req.query;

    // Construir WHERE dinámico según el parámetro estado
    let whereClause = "";
    let queryParams = [];

    if (estado === "habilitados") {
      whereClause = "WHERE c.habilitar = 1";
    } else if (estado === "deshabilitados") {
      whereClause = "WHERE c.habilitar = 0";
    }
    // Si estado es 'todos' o no se envía parámetro, no se aplica filtro (trae todos)

    const [rows] = await promisePool.execute(
      `SELECT c.id_cliente,
        c.nombre,
        c.apellido,
        c.telefono,
        c.email,
        c.id_tarjeta,
        c.foto_perfil,
        c.preferencias,
        c.habilitar,
        t.uuid AS tarjeta_uuid,
        t.saldo_actual,
        ts.nombre AS tipo_suscripcion,
        ns.nombre AS nivel_suscripcion,
        ns.limite_credito
       FROM Cliente c
       LEFT JOIN Tarjeta t ON t.id_tarjeta = c.id_tarjeta
       LEFT JOIN TipoSuscripcion ts ON t.id_tipo_suscripcion = ts.id_tipo
       LEFT JOIN NivelSuscripcion ns ON t.id_nivel_suscripcion = ns.id_nivel
       ${whereClause}
       ORDER BY c.habilitar DESC, c.id_cliente`,
      queryParams
    );

    // Agregar URL completa de las imágenes de perfil
    const clientesConImagenes = mapClientesRows(rows).map((cliente) => {
      if (cliente.fotoPerfil) {
        cliente.fotoPerfilUrl = getFileUrl(req, cliente.fotoPerfil, "clientes");
      }
      return cliente;
    });

    res.json({
      success: true,
      data: clientesConImagenes,
      message: "Clientes obtenidos correctamente",
    });
  } catch (error) {
    console.error("Error al obtener clientes:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Obtener un cliente por ID
 */
const getClientePorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await promisePool.execute(
      `SELECT c.id_cliente,
        c.nombre,
        c.apellido,
        c.telefono,
        c.email,
        c.id_tarjeta,
        c.foto_perfil,
        c.preferencias,
        t.uuid AS tarjeta_uuid,
        t.saldo_actual,
        ts.nombre AS tipo_suscripcion,
        ns.nombre AS nivel_suscripcion,
        ns.limite_credito
       FROM Cliente c
       LEFT JOIN Tarjeta t ON t.id_tarjeta = c.id_tarjeta
       LEFT JOIN TipoSuscripcion ts ON t.id_tipo_suscripcion = ts.id_tipo
       LEFT JOIN NivelSuscripcion ns ON t.id_nivel_suscripcion = ns.id_nivel
       WHERE c.id_cliente = ? AND c.habilitar = 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    const clienteMapeado = mapClienteRow(rows[0]);
    if (clienteMapeado.fotoPerfil) {
      clienteMapeado.fotoPerfilUrl = getFileUrl(
        req,
        clienteMapeado.fotoPerfil,
        "clientes"
      );
    }

    res.json({
      success: true,
      data: clienteMapeado,
      message: "Cliente obtenido correctamente",
    });
  } catch (error) {
    console.error("Error al obtener cliente:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Crear un nuevo cliente
 */
const crearCliente = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      telefono,
      email,
      contrasena,
      idTarjeta,
      preferencias,
    } = req.body;
    const fotoPerfil = req.file ? req.file.filename : null; // Imagen subida con multer

    // Función auxiliar para eliminar imagen si hay error
    const eliminarImagenSubida = async () => {
      if (req.file) {
        const rutaImagen = path.join(
          __dirname,
          "..",
          "uploads",
          "clientes",
          req.file.filename
        );
        await deleteFile(rutaImagen);
      }
    };

    // Validaciones básicas
    if (!nombre || !apellido) {
      await eliminarImagenSubida();
      return res.status(400).json({
        success: false,
        message: "Los campos nombre y apellido son obligatorios",
      });
    }

    if (!email) {
      await eliminarImagenSubida();
      return res.status(400).json({
        success: false,
        message: "El campo email es obligatorio",
      });
    }

    if (!contrasena) {
      await eliminarImagenSubida();
      return res.status(400).json({
        success: false,
        message: "El campo contrasena es obligatorio",
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await eliminarImagenSubida();
      return res.status(400).json({
        success: false,
        message: "El formato del email es inválido",
      });
    }

    // Verificar si el email ya existe (habilitado o no)
    const [emailExistente] = await promisePool.execute(
      "SELECT id_cliente FROM Cliente WHERE email = ?",
      [email]
    );

    if (emailExistente.length > 0) {
      // Verificar si está habilitado
      const [habilitado] = await promisePool.execute(
        "SELECT id_cliente FROM Cliente WHERE email = ? AND habilitar = 1",
        [email]
      );
      
      if (habilitado.length > 0) {
        await eliminarImagenSubida();
        return res.status(409).json({
          success: false,
          message: "El email ya está registrado",
        });
      }
      
      // Si existe pero deshabilitado, reactivas y actualizas
      const hashedPassword = await hashPassword(contrasena);
      
      await promisePool.execute(
        `UPDATE Cliente 
         SET nombre = ?, apellido = ?, telefono = ?, contrasena = ?, 
             id_tarjeta = ?, foto_perfil = ?, preferencias = ?, habilitar = 1 
         WHERE email = ?`,
        [
          nombre,
          apellido,
          telefono || null,
          hashedPassword,
          idTarjeta || null,
          fotoPerfil || null,
          preferencias || null,
          email
        ]
      );
      
      const [clienteReactivado] = await promisePool.execute(
        `SELECT c.id_cliente, c.nombre, c.apellido, c.telefono, c.email, 
                c.id_tarjeta, c.foto_perfil, c.preferencias,
                t.uuid AS tarjeta_uuid
         FROM Cliente c
         LEFT JOIN Tarjeta t ON t.id_tarjeta = c.id_tarjeta
         WHERE c.email = ?`,
        [email]
      );
      
      const nuevoCliente = mapClienteRow(clienteReactivado[0]);
      if (nuevoCliente.fotoPerfil) {
        nuevoCliente.fotoPerfilUrl = getFileUrl(req, nuevoCliente.fotoPerfil, "clientes");
      }
      
      return res.status(201).json({
        success: true,
        data: nuevoCliente,
        message: "Cliente reactivado correctamente",
      });
    }

    // Si se proporciona idTarjeta, verificar que existe y está habilitada
    if (idTarjeta) {
      const [tarjeta] = await promisePool.execute(
        "SELECT id_tarjeta FROM Tarjeta WHERE id_tarjeta = ? AND habilitar = 1",
        [idTarjeta]
      );

      if (tarjeta.length === 0) {
        await eliminarImagenSubida();
        return res.status(404).json({
          success: false,
          message: "La tarjeta especificada no existe o está deshabilitada",
        });
      }
    }

    const hashedPassword = await hashPassword(contrasena);

    const [result] = await promisePool.execute(
      `INSERT INTO Cliente (nombre, apellido, telefono, email, contrasena, id_tarjeta, foto_perfil, preferencias, habilitar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        nombre,
        apellido,
        telefono || null,
        email,
        hashedPassword,
        idTarjeta || null,
        fotoPerfil || null,
        preferencias || null,
      ]
    );

    const nuevoCliente = mapClienteRow({
      id_cliente: result.insertId,
      nombre,
      apellido,
      telefono: telefono || null,
      email,
      id_tarjeta: idTarjeta || null,
      foto_perfil: fotoPerfil || null,
      preferencias: preferencias || null,
    });

    if (nuevoCliente.fotoPerfil) {
      nuevoCliente.fotoPerfilUrl = getFileUrl(
        req,
        nuevoCliente.fotoPerfil,
        "clientes"
      );
    }

    res.status(201).json({
      success: true,
      data: nuevoCliente,
      message: "Cliente creado correctamente",
    });
  } catch (error) {
    // Si hay un error general, eliminar la imagen subida
    if (req.file) {
      const rutaImagen = path.join(
        __dirname,
        "..",
        "uploads",
        "clientes",
        req.file.filename
      );
      await deleteFile(rutaImagen);
    }

    console.error("Error al crear cliente:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "El email ya está registrado",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Actualizar un cliente existente
 */
const actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      apellido,
      telefono,
      email,
      contrasena,
      idTarjeta,
      preferencias,
    } = req.body;

    // Obtener el cliente existente para manejar la imagen anterior
    const [clienteExistente] = await promisePool.execute(
      "SELECT foto_perfil FROM Cliente WHERE id_cliente = ? AND habilitar = 1",
      [id]
    );

    if (clienteExistente.length === 0) {
      // Si se subió una imagen, eliminarla porque el cliente no existe
      if (req.file) {
        const rutaImagen = path.join(
          __dirname,
          "..",
          "uploads",
          "clientes",
          req.file.filename
        );
        await deleteFile(rutaImagen);
      }

      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    // Función auxiliar para eliminar imagen subida en caso de error
    const eliminarImagenSubida = async () => {
      if (req.file) {
        const rutaImagen = path.join(
          __dirname,
          "..",
          "uploads",
          "clientes",
          req.file.filename
        );
        await deleteFile(rutaImagen);
      }
    };

    const campos = [];
    const valores = [];

    if (nombre !== undefined) {
      if (!nombre.trim()) {
        await eliminarImagenSubida();
        return res.status(400).json({
          success: false,
          message: "El nombre no puede estar vacío",
        });
      }
      campos.push("nombre = ?");
      valores.push(nombre);
    }

    if (apellido !== undefined) {
      if (!apellido.trim()) {
        await eliminarImagenSubida();
        return res.status(400).json({
          success: false,
          message: "El apellido no puede estar vacío",
        });
      }
      campos.push("apellido = ?");
      valores.push(apellido);
    }

    if (telefono !== undefined) {
      campos.push("telefono = ?");
      valores.push(telefono || null);
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        await eliminarImagenSubida();
        return res.status(400).json({
          success: false,
          message: "El formato del email es inválido",
        });
      }

      // Verificar si el email ya existe en otro cliente (habilitado)
      const [emailExistente] = await promisePool.execute(
        "SELECT id_cliente FROM Cliente WHERE email = ? AND id_cliente != ? AND habilitar = 1",
        [email, id]
      );

      if (emailExistente.length > 0) {
        await eliminarImagenSubida();
        return res.status(409).json({
          success: false,
          message: "El email ya está registrado por otro cliente",
        });
      }

      campos.push("email = ?");
      valores.push(email);
    }

    if (contrasena !== undefined && contrasena !== null && contrasena !== "") {
      const hashedPassword = await hashPassword(contrasena);
      campos.push("contrasena = ?");
      valores.push(hashedPassword);
    }

    if (idTarjeta !== undefined) {
      if (idTarjeta !== null) {
        const [tarjeta] = await promisePool.execute(
          "SELECT id_tarjeta FROM Tarjeta WHERE id_tarjeta = ? AND habilitar = 1",
          [idTarjeta]
        );

        if (tarjeta.length === 0) {
          await eliminarImagenSubida();
          return res.status(404).json({
            success: false,
            message: "La tarjeta especificada no existe o está deshabilitada",
          });
        }
      }
      campos.push("id_tarjeta = ?");
      valores.push(idTarjeta);
    }

    // Manejar nueva imagen si se subió
    if (req.file) {
      // Si hay una imagen anterior, eliminarla
      if (clienteExistente[0].foto_perfil) {
        const rutaImagenAnterior = path.join(
          __dirname,
          "..",
          "uploads",
          "clientes",
          clienteExistente[0].foto_perfil
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
      if (clienteExistente[0].foto_perfil) {
        const rutaImagenAnterior = path.join(
          __dirname,
          "..",
          "uploads",
          "clientes",
          clienteExistente[0].foto_perfil
        );
        await deleteFile(rutaImagenAnterior);
      }
      campos.push("foto_perfil = ?");
      valores.push(null);
    }
    if (preferencias !== undefined) {
      campos.push("preferencias = ?");
      valores.push(preferencias || null);
    }

    if (campos.length === 0) {
      await eliminarImagenSubida();
      return res.status(400).json({
        success: false,
        message: "Debe enviar al menos un campo para actualizar",
      });
    }

    valores.push(id);

    const [result] = await promisePool.execute(
      `UPDATE Cliente SET ${campos.join(", ")} WHERE id_cliente = ?`,
      valores
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    const [rows] = await promisePool.execute(
      `SELECT c.id_cliente,
        c.nombre,
        c.apellido,
        c.telefono,
        c.email,
        c.id_tarjeta,
        c.foto_perfil,
        c.preferencias,
        t.uuid AS tarjeta_uuid
       FROM Cliente c
       LEFT JOIN Tarjeta t ON t.id_tarjeta = c.id_tarjeta
       WHERE c.id_cliente = ?`,
      [id]
    );

    const clienteActualizado = mapClienteRow(rows[0]);
    if (clienteActualizado.fotoPerfil) {
      clienteActualizado.fotoPerfilUrl = getFileUrl(
        req,
        clienteActualizado.fotoPerfil,
        "clientes"
      );
    }

    res.json({
      success: true,
      data: clienteActualizado,
      message: "Cliente actualizado correctamente",
    });
  } catch (error) {
    // Si hay un error general, eliminar la imagen subida
    if (req.file) {
      const rutaImagen = path.join(
        __dirname,
        "..",
        "uploads",
        "clientes",
        req.file.filename
      );
      await deleteFile(rutaImagen);
    }

    console.error("Error al actualizar cliente:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "El email ya está registrado",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Desvincular la tarjeta asociada a un cliente
 * PATCH /api/clientes/:id/desvincular-tarjeta
 */
const desvincularTarjetaCliente = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    const [clienteRows] = await connection.execute(
      `SELECT c.id_cliente,
              c.nombre,
              c.apellido,
              c.id_tarjeta,
              t.uuid AS tarjeta_uuid,
              t.id_tipo_suscripcion,
              ts.nombre AS nombre_tipo_suscripcion,
              t.id_nivel_suscripcion,
              ns.nombre AS nombre_nivel_suscripcion,
              t.saldo_actual
         FROM Cliente c
         LEFT JOIN Tarjeta t ON t.id_tarjeta = c.id_tarjeta
         LEFT JOIN TipoSuscripcion ts ON ts.id_tipo = t.id_tipo_suscripcion
         LEFT JOIN NivelSuscripcion ns ON ns.id_nivel = t.id_nivel_suscripcion
        WHERE c.id_cliente = ?
        FOR UPDATE`,
      [id]
    );

    if (clienteRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    const cliente = clienteRows[0];

    if (cliente.id_tarjeta === null) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "El cliente no tiene una tarjeta asociada",
      });
    }

    const idTarjeta = cliente.id_tarjeta;

    await connection.execute(
      `UPDATE Cliente SET id_tarjeta = NULL WHERE id_cliente = ?`,
      [id]
    );

    const tipoSuscripcionDefault = cliente.id_tipo_suscripcion || 1; // 1 = PREPAGA

    await connection.execute(
      `UPDATE Tarjeta
          SET id_tipo_suscripcion = ?,
              id_nivel_suscripcion = NULL,
              saldo_actual = 0
        WHERE id_tarjeta = ?`,
      [tipoSuscripcionDefault, idTarjeta]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Tarjeta desvinculada correctamente",
      data: {
        cliente: {
          id: cliente.id_cliente,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
        },
        tarjeta: {
          id: idTarjeta,
          uuid: cliente.tarjeta_uuid,
          tipoSuscripcionAnterior: cliente.nombre_tipo_suscripcion,
          nivelSuscripcionAnterior: cliente.nombre_nivel_suscripcion,
          saldoAnterior: cliente.saldo_actual,
        },
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al desvincular tarjeta del cliente:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Eliminar un cliente (borrado lógico)
 */
const eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el cliente existe y está habilitado
    const [clienteExiste] = await promisePool.execute(
      "SELECT id_cliente FROM Cliente WHERE id_cliente = ? AND habilitar = 1",
      [id]
    );

    if (clienteExiste.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    // Borrado lógico
    // NO eliminamos la imagen del servidor - se conserva por si el cliente se reactiva
    const [result] = await promisePool.execute(
      "UPDATE Cliente SET habilitar = 0 WHERE id_cliente = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Cliente deshabilitado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar cliente:", error);

    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/**
 * Toggle el estado de habilitación de un cliente
 */
const toggleCliente = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el cliente existe
    const [clienteExiste] = await promisePool.execute(
      "SELECT id_cliente, nombre, apellido, habilitar FROM Cliente WHERE id_cliente = ?",
      [id]
    );

    if (clienteExiste.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    // Toggle: cambiar habilitar de 1 a 0 o de 0 a 1
    const nuevoEstado = clienteExiste[0].habilitar === 1 ? 0 : 1;

    await promisePool.execute(
      "UPDATE Cliente SET habilitar = ? WHERE id_cliente = ?",
      [nuevoEstado, id]
    );

    res.json({
      success: true,
      message: nuevoEstado === 1 ? "Cliente habilitado correctamente" : "Cliente deshabilitado correctamente",
      data: { id: parseInt(id), habilitar: nuevoEstado },
    });
  } catch (error) {
    console.error("Error al toggle cliente:", error);

    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

module.exports = {
  getClientes,
  getClientePorId,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  desvincularTarjetaCliente,
  toggleCliente,
};
