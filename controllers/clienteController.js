const bcrypt = require("bcrypt");
const { promisePool } = require("../config/database");
const { mapClienteRow, mapClientesRows } = require("../helpers/clienteMapper");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

const hashPassword = async (password) => {
  if (!password) {
    throw new Error("La contraseña no puede estar vacía");
  }
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Obtener todos los clientes
 */
const getClientes = async (req, res) => {
  try {
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
       ORDER BY c.id_cliente`
    );

    res.json({
      success: true,
      data: mapClientesRows(rows),
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
        t.uuid AS tarjeta_uuid
       FROM Cliente c
       LEFT JOIN Tarjeta t ON t.id_tarjeta = c.id_tarjeta
       WHERE c.id_cliente = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    res.json({
      success: true,
      data: mapClienteRow(rows[0]),
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
    const { nombre, apellido, telefono, email, contrasena, idTarjeta, fotoPerfil, preferencias } =
      req.body;

    // Validaciones básicas
    if (!nombre || !apellido) {
      return res.status(400).json({
        success: false,
        message: "Los campos nombre y apellido son obligatorios",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "El campo email es obligatorio",
      });
    }

    if (!contrasena) {
      return res.status(400).json({
        success: false,
        message: "El campo contrasena es obligatorio",
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "El formato del email es inválido",
      });
    }

    // Verificar si el email ya existe
    const [emailExistente] = await promisePool.execute(
      "SELECT id_cliente FROM Cliente WHERE email = ?",
      [email]
    );

    if (emailExistente.length > 0) {
      return res.status(409).json({
        success: false,
        message: "El email ya está registrado",
      });
    }

    // Si se proporciona idTarjeta, verificar que existe
    if (idTarjeta) {
      const [tarjeta] = await promisePool.execute(
        "SELECT id_tarjeta FROM Tarjeta WHERE id_tarjeta = ?",
        [idTarjeta]
      );

      if (tarjeta.length === 0) {
        return res.status(404).json({
          success: false,
          message: "La tarjeta especificada no existe",
        });
      }
    }

    const hashedPassword = await hashPassword(contrasena);

    const [result] = await promisePool.execute(
      `INSERT INTO Cliente (nombre, apellido, telefono, email, contrasena, id_tarjeta, foto_perfil, preferencias)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, telefono || null, email, hashedPassword, idTarjeta || null, fotoPerfil || null, preferencias || null]
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

    res.status(201).json({
      success: true,
      data: nuevoCliente,
      message: "Cliente creado correctamente",
    });
  } catch (error) {
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
    const { nombre, apellido, telefono, email, contrasena, idTarjeta, fotoPerfil, preferencias } =
      req.body;

    const campos = [];
    const valores = [];

    if (nombre !== undefined) {
      if (!nombre.trim()) {
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
        return res.status(400).json({
          success: false,
          message: "El formato del email es inválido",
        });
      }

      // Verificar si el email ya existe en otro cliente
      const [emailExistente] = await promisePool.execute(
        "SELECT id_cliente FROM Cliente WHERE email = ? AND id_cliente != ?",
        [email, id]
      );

      if (emailExistente.length > 0) {
        return res.status(409).json({
          success: false,
          message: "El email ya está registrado por otro cliente",
        });
      }

      campos.push("email = ?");
      valores.push(email);
    }

    if (contrasena !== undefined) {
      if (!contrasena) {
        return res.status(400).json({
          success: false,
          message: "La contraseña no puede estar vacía",
        });
      }
      const hashedPassword = await hashPassword(contrasena);
      campos.push("contrasena = ?");
      valores.push(hashedPassword);
    }

    if (idTarjeta !== undefined) {
      if (idTarjeta !== null) {
        const [tarjeta] = await promisePool.execute(
          "SELECT id_tarjeta FROM Tarjeta WHERE id_tarjeta = ?",
          [idTarjeta]
        );

        if (tarjeta.length === 0) {
          return res.status(404).json({
            success: false,
            message: "La tarjeta especificada no existe",
          });
        }
      }
      campos.push("id_tarjeta = ?");
      valores.push(idTarjeta);
    }

    if (fotoPerfil !== undefined) {
      campos.push("foto_perfil = ?");
      valores.push(fotoPerfil || null);
    }

    if (preferencias !== undefined) {
      campos.push("preferencias = ?");
      valores.push(preferencias || null);
    }

    if (campos.length === 0) {
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

    res.json({
      success: true,
      data: mapClienteRow(rows[0]),
      message: "Cliente actualizado correctamente",
    });
  } catch (error) {
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
 * Eliminar un cliente
 */
const eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await promisePool.execute(
      "DELETE FROM Cliente WHERE id_cliente = ?",
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
      message: "Cliente eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar cliente:", error);

    // Si hay restricciones de clave foránea
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message:
          "No se puede eliminar el cliente porque tiene registros relacionados",
      });
    }

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
};
