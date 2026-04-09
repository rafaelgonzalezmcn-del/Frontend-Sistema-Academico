import { apiNormalized, api } from './apiNormalized';

const EntregaService = {
  /**
   * Subir una entrega para una tarea
   * @param {number} tareaId - ID de la tarea
   * @param {FormData} formData - FormData con el archivo
   * @returns {Promise} - Promesa con la respuesta normalizada
   */
  subirEntrega(tareaId, formData) {
    return apiNormalized.post(`/entregas/${tareaId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Obtener mi entrega para una tarea (para estudiantes)
   * @param {number} tareaId - ID de la tarea
   * @returns {Promise} - Promesa con la respuesta normalizada
   */
  obtenerMiEntrega(tareaId) {
    return apiNormalized.get(`/entregas/${tareaId}/mi-entrega`);
  },

  /**
   * Obtener todas las entregas de una tarea (para profesores)
   * @param {number} tareaId - ID de la tarea
   * @returns {Promise} - Promesa con la respuesta normalizada
   */
  obtenerEntregasTarea(tareaId) {
    return apiNormalized.get(`/entregas/${tareaId}`);
  },

  /**
   * Descargar un archivo de entrega
   * NOTA: Usa api raw (no normalizado) porque devuelve un blob
   * @param {number} entregaId - ID de la entrega
   * @returns {Promise} - Promesa con la respuesta raw (blob)
   */
  descargarEntrega(entregaId) {
    return api.get(`/entregas/descargar/${entregaId}`);
  },

  /**
   * Calificar una entrega
   * @param {number} entregaId - ID de la entrega o 'crear' para crear nueva
   * @param {object} data - Datos de la calificación (nota, observaciones, tarea_id, estudiante_id)
   * @returns {Promise} - Promesa con la respuesta normalizada
   */
  calificarEntrega(entregaId, data) {
    // Si es 'crear', usar la ruta POST para calificar directo
    if (entregaId === 'crear') {
      return apiNormalized.post('/calificar-estudiante', data);
    }
    return apiNormalized.put(`/entregas/calificar/${entregaId}`, data);
  },

  /**
   * Eliminar una entrega
   * @param {number} entregaId - ID de la entrega
   * @returns {Promise} - Promesa con la respuesta normalizada
   */
  eliminarEntrega(entregaId) {
    return apiNormalized.delete(`/entregas/${entregaId}`);
  }
};

export default EntregaService;