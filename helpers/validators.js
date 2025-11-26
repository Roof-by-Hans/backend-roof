/**
 * Validadores reutilizables para inputs
 */
const validators = {
  /**
   * Valida formato de email
   */
  email: (email) => {
    if (!email) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  /**
   * Valida que sea un número positivo
   */
  positiveNumber: (value) => {
    if (value === undefined || value === null) return false;
    const num = Number(value);
    return !isNaN(num) && num > 0;
  },

  /**
   * Valida que sea un número no negativo (>= 0)
   */
  nonNegativeNumber: (value) => {
    if (value === undefined || value === null) return false;
    const num = Number(value);
    return !isNaN(num) && num >= 0;
  },

  /**
   * Valida que sea un entero positivo
   */
  positiveInteger: (value) => {
    if (value === undefined || value === null) return false;
    const num = Number(value);
    return Number.isInteger(num) && num > 0;
  },

  /**
   * Valida que el valor no esté vacío
   */
  notEmpty: (value) => {
    if (value === undefined || value === null) return false;
    return String(value).trim() !== "";
  },

  /**
   * Valida que sea un string no vacío
   */
  nonEmptyString: (value) => {
    return typeof value === "string" && value.trim() !== "";
  },

  /**
   * Valida longitud mínima de string
   */
  minLength: (min) => (value) => {
    if (!value) return false;
    return String(value).length >= min;
  },

  /**
   * Valida longitud máxima de string
   */
  maxLength: (max) => (value) => {
    if (!value) return true; // Si está vacío, no validar longitud
    return String(value).length <= max;
  },

  /**
   * Valida que el valor esté en una lista de opciones
   */
  oneOf: (options) => (value) => {
    return options.includes(value);
  },
};

/**
 * Valida múltiples campos según reglas definidas
 * @param {Object} rules - Objeto con reglas de validación por campo
 * @param {Object} data - Datos a validar
 * @returns {Object} { isValid: boolean, errors: Array }
 */
const validate = (rules, data) => {
  const errors = [];

  for (const [field, validations] of Object.entries(rules)) {
    const value = data[field];

    for (const validation of validations) {
      if (!validation.validator(value)) {
        errors.push({
          field,
          message: validation.message,
        });
        break; // Solo reportar el primer error por campo
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Middleware para validar request body
 * @param {Object} rules - Reglas de validación
 * @returns {Function} Middleware de Express
 */
const validateRequest = (rules) => {
  return (req, res, next) => {
    const validation = validate(rules, req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Errores de validación",
        errors: validation.errors,
      });
    }

    next();
  };
};

module.exports = {
  validators,
  validate,
  validateRequest,
};
