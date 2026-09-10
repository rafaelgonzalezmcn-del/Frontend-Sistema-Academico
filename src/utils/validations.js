/**
 * Validadores reutilizables para frontend
 * Correspondencia con reglas de validación Laravel
 * 
 * Nota: Estas validaciones son complementarias al backend.
 * El backend sigue siendo la fuente de verdad final.
 */

import { ref, computed } from 'vue';

/**
 * Validar que un campo no esté vacío
 * @param {any} value - Valor a validar
 * @param {string} fieldName - Nombre del campo para mensaje
 * @returns {string|null} - Mensaje de error o null si es válido
 */
export function validateRequired(value, fieldName = 'Este campo') {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} es requerido`;
  }
  if (Array.isArray(value) && value.length === 0) {
    return `${fieldName} es requerido`;
  }
  return null;
}

/**
 * Validar formato de email
 * @param {string} value - Email a validar
 * @returns {string|null} - Mensaje de error o null si es válido
 */
export function validateEmail(value) {
  if (!value) return null; // Required es validación separada
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'El correo electrónico debe ser válido';
  }
  return null;
}

/**
 * Validar longitud mínima
 * @param {string} value - Valor a validar
 * @param {number} min - Longitud mínima
 * @param {string} fieldName - Nombre del campo para mensaje
 * @returns {string|null} - Mensaje de error o null si es válido
 */
export function validateMinLength(value, min, fieldName = 'Este campo') {
  if (!value) return null;
  
  if (value.length < min) {
    return `${fieldName} debe tener al menos ${min} caracteres`;
  }
  return null;
}

/**
 * Validar longitud máxima
 * @param {string} value - Valor a validar
 * @param {number} max - Longitud máxima
 * @param {string} fieldName - Nombre del campo para mensaje
 * @returns {string|null} - Mensaje de error o null si es válido
 */
export function validateMaxLength(value, max, fieldName = 'Este campo') {
  if (!value) return null;
  
  if (value.length > max) {
    return `${fieldName} no puede exceder ${max} caracteres`;
  }
  return null;
}

/**
 * Validar contraseña mínima (8 caracteres)
 * @param {string} value - Contraseña a validar
 * @returns {string|null} - Mensaje de error o null si es válido
 */
export function validatePassword(value) {
  if (!value) return null;
  
  if (value.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  return null;
}

/**
 * Validar que sea un entero positivo
 * @param {any} value - Valor a validar
 * @param {string} fieldName - Nombre del campo para mensaje
 * @returns {string|null} - Mensaje de error o null si es válido
 */
export function validatePositiveInteger(value, fieldName = 'Este campo') {
  if (!value && value !== 0) return null;
  
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1) {
    return `${fieldName} debe ser un número positivo`;
  }
  return null;
}

/**
 * Validar fecha no anterior a hoy
 * @param {string} value - Fecha a validar
 * @returns {string|null} - Mensaje de error o null si es válido
 */
export function validateFutureDate(value) {
  if (!value) return null;
  
  const inputDate = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (inputDate < today) {
    return 'La fecha debe ser futura';
  }
  return null;
}

/**
 * Validar tamaño de archivo en MB
 * @param {File|null} file - Archivo a validar
 * @param {number} maxMB - Tamaño máximo en MB
 * @returns {string|null} - Mensaje de error o null si es válido
 */
export function validateFileSize(file, maxMB) {
  if (!file) return null;
  
  const maxBytes = maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `El archivo no puede exceder ${maxMB}MB`;
  }
  return null;
}

/**
 * Validar tipos de archivo permitidos
 * @param {File|null} file - Archivo a validar
 * @param {string[]} allowedMimes - Array de mimes permitidos
 * @returns {string|null} - Mensaje de error o null si es válido
 */
export function validateFileType(file, allowedMimes) {
  if (!file) return null;
  
  const ext = file.name.split('.').pop().toLowerCase();
  const allowedExts = allowedMimes.map(m => m.split('/')[1]);
  
  if (!allowedExts.includes(ext)) {
    return `El archivo debe ser: ${allowedExts.join(', ')}`;
  }
  return null;
}

/**
 * Composable para manejo de errores de formulario
 * @param {Object} initialValues - Valores iniciales del formulario
 * @returns {Object} - Métodos y estados para validación
 */
export function useFormValidation(initialValues = {}) {
  const values = ref({ ...initialValues });
  const errors = ref({});
  const touched = ref({});
  
  /**
   * Validar un campo específico
   * @param {string} field - Nombre del campo
   * @param {Function[]} validators - Array de funciones validado
   */
  const validateField = (field, validators) => {
    const value = values.value[field];
    let error = null;
    
    for (const validator of validators) {
      error = validator(value);
      if (error) break;
    }
    
    errors.value[field] = error;
    touched.value[field] = true;
    
    return !error;
  };
  
  /**
   * Validar todo el formulario
   * @param {Object} fieldValidators - Objeto con campos y sus validadores
   * @returns {boolean} - True si el formulario es válido
   */
  const validateAll = (fieldValidators) => {
    let isValid = true;
    
    for (const [field, validators] of Object.entries(fieldValidators)) {
      const fieldValid = validateField(field, validators);
      if (!fieldValid) isValid = false;
    }
    
    return isValid;
  };
  
  /**
   * Limpiar errores de un campo
   * @param {string} field - Nombre del campo
   */
  const clearField = (field) => {
    errors.value[field] = null;
  };
  
  /**
   * Limpiar todos los errores
   */
  const clearAll = () => {
    errors.value = {};
    touched.value = {};
  };
  
  /**
   * Obtener error de un campo
   */
  const getError = (field) => {
    return touched.value[field] ? errors.value[field] : null;
  };
  
  /**
   * Verificar si un campo tiene error
   */
  const hasError = (field) => {
    return touched.value[field] && !!errors.value[field];
  };
  
  return {
    values,
    errors,
    touched,
    validateField,
    validateAll,
    clearField,
    clearAll,
    getError,
    hasError
  };
}

export default {
  validateRequired,
  validateEmail,
  validateMinLength,
  validateMaxLength,
  validatePassword,
  validatePositiveInteger,
  validateFutureDate,
  validateFileSize,
  validateFileType,
  useFormValidation
};