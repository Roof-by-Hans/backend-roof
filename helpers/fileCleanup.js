const path = require("path");
const { deleteFile } = require("../config/multer");

/**
 * Eliminar archivo subido en caso de error
 * @param {Object} req - Objeto request de Express
 * @param {string} subdirectorio - Subdirectorio dentro de uploads (ej: 'clientes', 'productos')
 */
const limpiarArchivoSubido = async (req, subdirectorio) => {
  if (!req.file) return;
  
  const rutaArchivo = path.join(
    __dirname,
    "..",
    "uploads",
    subdirectorio,
    req.file.filename
  );
  
  await deleteFile(rutaArchivo);
};

/**
 * Eliminar archivo específico por nombre
 * @param {string} nombreArchivo - Nombre del archivo a eliminar
 * @param {string} subdirectorio - Subdirectorio dentro de uploads
 */
const eliminarArchivo = async (nombreArchivo, subdirectorio) => {
  if (!nombreArchivo) return;
  
  const rutaArchivo = path.join(
    __dirname,
    "..",
    "uploads",
    subdirectorio,
    nombreArchivo
  );
  
  await deleteFile(rutaArchivo);
};

module.exports = {
  limpiarArchivoSubido,
  eliminarArchivo,
};
