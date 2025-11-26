/**
 * Redondea un valor numérico a 2 decimales
 * @param {number|string} value - Valor a redondear
 * @returns {number} - Valor redondeado
 */
const roundCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.round(num * 100) / 100;
};

/**
 * Parsea y valida un campo decimal
 * @param {any} value - Valor a parsear
 * @param {Object} options - Opciones de validación
 * @param {string} options.fieldName - Nombre del campo para mensajes de error
 * @param {boolean} [options.required=false] - Si es obligatorio
 * @param {any} [options.defaultValue=null] - Valor por defecto si es null/undefined
 * @param {boolean} [options.allowNegative=true] - Si permite negativos
 * @returns {Object} - { value: number|null, error: string|null }
 */
const parseDecimalField = (
  value,
  { fieldName, required = false, defaultValue = null, allowNegative = true }
) => {
  if (value === undefined || value === null) {
    if (required) {
      return { error: `El campo ${fieldName} es obligatorio` };
    }
    return { value: defaultValue };
  }

  const normalized = typeof value === "string" ? value.trim() : value;

  if (normalized === "") {
    if (required) {
      return { error: `El campo ${fieldName} es obligatorio` };
    }
    return { value: defaultValue };
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return {
      error: `El campo ${fieldName} debe ser un número válido`,
    };
  }

  if (!allowNegative && parsed < 0) {
    return {
      error: `El campo ${fieldName} no puede ser negativo`,
    };
  }

  return { value: roundCurrency(parsed) };
};

/**
 * Sanitiza y valida un array de subtotales
 * @param {Array} subtotales - Array de objetos { idMedioPago, monto }
 * @returns {Object} - { value: Array, error: string|null }
 */
const sanitizeSubtotales = (subtotales) => {
  if (!Array.isArray(subtotales)) {
    return { value: [] };
  }

  const cleaned = [];

  for (const item of subtotales) {
    if (typeof item !== "object" || item === null) {
      return {
        error: "Cada subtotal por medio de pago debe ser un objeto válido",
      };
    }

    const id = Number(item.idMedioPago ?? item.id_medio_pago);

    if (!Number.isInteger(id) || id <= 0) {
      return {
        error: "Cada subtotal debe incluir un idMedioPago numérico válido",
      };
    }

    const { value: monto, error } = parseDecimalField(item.monto, {
      fieldName: "monto del subtotal",
      required: true,
      allowNegative: false,
    });

    if (error) {
      return { error };
    }

    cleaned.push({ idMedioPago: id, monto });
  }

  return { value: cleaned };
};

module.exports = {
  roundCurrency,
  parseDecimalField,
  sanitizeSubtotales,
};
