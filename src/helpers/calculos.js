/**
 * Funciones puras para cálculos de notas
 */

/**
 * Calcula el promedio general de las notas
 * @param {Array} notasData - Array de notas de estudiantes
 * @returns {string} Promedio con 2 decimales
 */
export const calcularPromedioGeneral = (notasData) => {
  if (!notasData || notasData.length === 0) return '0.00';
  const suma = notasData.reduce((acc, nota) => acc + (nota.nota_final || 0), 0);
  return (suma / notasData.length).toFixed(2);
};

/**
 * Obtiene la nota final de un estudiante
 * @param {Array} notasData - Array de notas
 * @param {number|string} estudianteId - ID del estudiante
 * @returns {string} Nota con 2 decimales
 */
export const getNotaFinal = (notasData, estudianteId) => {
  if (!estudianteId) {
    return calcularPromedioGeneral(notasData);
  }
  const nota = notasData?.find(n => n.estudiante.id === estudianteId);
  return nota?.nota_final?.toFixed(2) || '0.00';
};

/**
 * Suma los porcentajes de los parámetros de un parcial
 * @param {Object} parcial - Objeto parcial con parámetros
 * @returns {number} Suma de porcentajes
 */
export const sumaPorcentajes = (parcial) => {
  if (!parcial?.parametros) return 0;
  return parcial.parametros.reduce((sum, p) => sum + (parseFloat(p.porcentaje) || 0), 0);
};

/**
 * Calcula la ponderación de una tarea
 * @param {number} notaParam - Nota del parámetro
 * @param {number} porcentaje - Porcentaje del parámetro
 * @returns {string} Ponderación con 2 decimales
 */
export const calcularPonderacion = (notaParam, porcentaje) => {
  if (typeof notaParam !== 'number' || typeof porcentaje !== 'number') return '-';
  const ponderacion = (notaParam / 100) * porcentaje;
  return ponderacion.toFixed(2);
};

/**
 * Formatea un valor numérico a 2 decimales
 * @param {number} valor - Valor a formatear
 * @returns {string} Valor formateado
 */
export const formatNota = (valor) => {
  if (typeof valor !== 'number') return '-';
  return valor.toFixed(2);
};
