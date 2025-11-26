/**
 * Wrapper para manejar errores asíncronos automáticamente
 * Elimina la necesidad de try-catch en cada controlador
 * @param {Function} fn - Función async del controlador
 * @returns {Function} Middleware de Express
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
