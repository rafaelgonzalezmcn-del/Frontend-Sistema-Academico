import { apiNormalized } from './apiNormalized';

const ParcialService = {
  /**
   * Obtener parciales de un módulo
   * @param {number} moduloId - ID del módulo
   * @returns {Promise} - Respuesta normalizada
   */
  obtenerParciales(moduloId) {
    return apiNormalized.get(`/modulos/${moduloId}/parciales`);
  },

  /**
   * Obtener parámetros de un parcial
   * @param {number} parcialId - ID del parcial
   * @returns {Promise} - Respuesta normalizada
   */
  obtenerParametros(parcialId) {
    return apiNormalized.get(`/parciales/${parcialId}/parametros`);
  },

  /**
   * Crear parcial
   * @param {object} data - Datos del parcial
   * @returns {Promise} - Respuesta normalizada
   */
  crearParcial(data) {
    return apiNormalized.post('/parciales', data);
  },

  /**
   * Actualizar parcial
   * @param {number} parcialId - ID del parcial
   * @param {object} data - Datos del parcial
   * @returns {Promise} - Respuesta normalizada
   */
  actualizarParcial(parcialId, data) {
    return apiNormalized.put(`/parciales/${parcialId}`, data);
  },

  /**
   * Crear parámetro
   * @param {number} parcialId - ID del parcial
   * @param {object} data - Datos del parámetro
   * @returns {Promise} - Respuesta normalizada
   */
  crearParametro(parcialId, data) {
    return apiNormalized.post(`/parciales/${parcialId}/parametros`, data);
  },

  /**
   * Actualizar parámetro
   * @param {number} parametroId - ID del parámetro
   * @param {object} data - Datos del parámetro
   * @returns {Promise} - Respuesta normalizada
   */
  actualizarParametro(parametroId, data) {
    return apiNormalized.put(`/parametros/${parametroId}`, data);
  },

  /**
   * Obtener resumen de notas de una materia (profesor)
   * @param {number} moduloId - ID del módulo
   * @returns {Promise} - Respuesta normalizada
   */
  obtenerResumenNotas(moduloId) {
    return apiNormalized.get(`/modulos/${moduloId}/notas/resumen`);
  },

  /**
   * Obtener notas de un estudiante (estudiante)
   * @param {number} moduloId - ID del módulo
   * @returns {Promise} - Respuesta normalizada
   */
  obtenerMisNotas(moduloId) {
    return apiNormalized.get(`/modulos/${moduloId}/notas/mis-notas`);
  }
};

export default ParcialService;
