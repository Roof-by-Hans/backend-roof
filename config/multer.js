const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear directorios si no existen
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Configuración de almacenamiento para productos
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'productos');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único con timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `producto-${uniqueSuffix}${fileExtension}`);
  }
});

// Configuración de almacenamiento para usuarios
const userStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'usuarios');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `usuario-${uniqueSuffix}${fileExtension}`);
  }
});

// Configuración de almacenamiento para clientes
const clientStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'clientes');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `cliente-${uniqueSuffix}${fileExtension}`);
  }
});

// Filtro de archivos - solo imágenes
// Utiliza códigos de error explícitos para evitar dependencias de cadenas de texto
const fileFilter = (req, file, cb) => {
  // Verificar que sea una imagen
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    const error = new Error('Solo se permiten archivos de imagen (JPG, PNG, GIF, etc.)');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Límites de tamaño (5MB máximo)
const limits = {
  fileSize: 5 * 1024 * 1024 // 5MB
};

// Crear instancias de multer para cada tipo
const uploadProduct = multer({
  storage: productStorage,
  fileFilter: fileFilter,
  limits: limits
});

const uploadUser = multer({
  storage: userStorage,
  fileFilter: fileFilter,
  limits: limits
});

const uploadClient = multer({
  storage: clientStorage,
  fileFilter: fileFilter,
  limits: limits
});

// Middleware para manejar errores de multer
const handleMulterError = (error, req, res, next) => {
  // Manejar errores específicos de multer (códigos nativos)
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 5MB permitido.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Demasiados archivos subidos.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Campo de archivo inesperado.'
      });
    }
  }
  
  // Validar por código de error personalizado en lugar de mensaje de texto
  // Esto evita dependencias frágiles de cadenas de texto
  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: 'Solo se permiten archivos de imagen (JPG, PNG, GIF, etc.)'
    });
  }
  
  next(error);
};

// Función para eliminar archivo si existe (optimizada con async/await)
const deleteFile = async (filePath) => {
  try {
    const fsPromises = require('fs').promises;
    await fsPromises.access(filePath);
    await fsPromises.unlink(filePath);
    return true;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Error al eliminar archivo:', err);
    }
    return false;
  }
};

// Función para verificar si un archivo existe
const fileExists = async (filePath) => {
  try {
    const fsPromises = require('fs').promises;
    await fsPromises.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// Función para obtener la URL completa del archivo
// Esta función genera la URL pública del archivo estático
// Las imágenes se sirven directamente desde /uploads sin necesidad de middleware adicional
const getFileUrl = (req, filename, type) => {
  if (!filename) return null;
  
  // Usar SERVER_URL si está definida, sino construir dinámicamente
  const baseUrl = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${type}/${filename}`;
};

module.exports = {
  uploadProduct,
  uploadUser,
  uploadClient,
  handleMulterError,
  deleteFile,
  fileExists,
  getFileUrl
};