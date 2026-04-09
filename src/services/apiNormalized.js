import axios from 'axios';
import { getData, getMessage, getMeta, getDownloadInfo } from '@/utils/responseHelper';

/**
 * Instancia base de axios
 * F4-T3: Mejorado para manejar errores 4xx/5xx correctamente
 */
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  // F4-T3: Aceptar todos los statuses para manejar errores en interceptor
  validateStatus: function (status) {
    return true; 
  },
});

// Interceptor para agregar el token Bearer
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// F4-T3: Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si hay respuesta del servidor
    if (error.response) {
      const status = error.response.status;
      
      // 401: Token expirado o inválido
      if (status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      
      // 403: No autorizado
      if (status === 403) {
        console.warn('Acceso denegado:', error.response.data?.message);
      }
      
      // 409: Conflicto (ej: entrega duplicada)
      if (status === 409) {
        console.warn('Conflicto:', error.response.data?.message);
      }
    }
    
    // Re-lanzar el error para que el código pueda manejarlo
    return Promise.reject(error);
  }
);

/**
 * Wrapper de axios que normaliza automáticamente las respuestas
 * Permite usar la API de forma tradicional o con helpers
 */
const apiNormalized = {
  /**
   * GET request
   * @param {string} url 
   * @param {object} config 
   * @returns {Promise<{data: any, raw: object, message: string, meta: object}>}
   */
  get: async (url, config = {}) => {
    const response = await api.get(url, config);
    return normalizeResponse(response);
  },

  /**
   * POST request
   * @param {string} url 
   * @param {any} data 
   * @param {object} config 
   * @returns {Promise<{data: any, raw: object, message: string, meta: object}>}
   */
  post: async (url, data = {}, config = {}) => {
    const response = await api.post(url, data, config);
    return normalizeResponse(response);
  },

  /**
   * PUT request
   * @param {string} url 
   * @param {any} data 
   * @param {object} config 
   * @returns {Promise<{data: any, raw: object, message: string, meta: object}>}
   */
  put: async (url, data = {}, config = {}) => {
    const response = await api.put(url, data, config);
    return normalizeResponse(response);
  },

  /**
   * PATCH request
   * @param {string} url 
   * @param {any} data 
   * @param {object} config 
   * @returns {Promise<{data: any, raw: object, message: string, meta: object}>}
   */
  patch: async (url, data = {}, config = {}) => {
    const response = await api.patch(url, data, config);
    return normalizeResponse(response);
  },

  /**
   * DELETE request
   * @param {string} url 
   * @param {object} config 
   * @returns {Promise<{data: any, raw: object, message: string, meta: object}>}
   */
  delete: async (url, config = {}) => {
    const response = await api.delete(url, config);
    return normalizeResponse(response);
  },

  // Métodos especiales
  
  /**
   * Para descargas - devuelve la respuesta raw sin normalizar
   * @param {string} url 
   * @param {object} config 
   * @returns {Promise<object>}
   */
  download: async (url, config = {}) => {
    return api.get(url, { ...config, responseType: 'blob' });
  },

  /**
   * Obtener respuesta raw (sin normalizar)
   * Útil cuando necesitas acceso completo al response
   * @param {string} url 
   * @param {object} config 
   * @returns {Promise<object>}
   */
  raw: async (url, config = {}) => {
    const response = await api.get(url, config);
    return response;
  }
};

/**
 * Normaliza una respuesta de axios al formato unificado
 * @param {object} response - Respuesta de axios
 * @returns {object} - Respuesta normalizada
 */
function normalizeResponse(response) {
  // Extraer los datos normalizados
  const normalizedData = getData(response);
  
  return {
    // DATOS NORMALIZADOS - esto es lo que el código espera en .data
    data: normalizedData,
    
    // METADATOS
    meta: getMeta(response),
    
    // MENSAJE
    message: getMessage(response),
    
    // INFO DE DOWNLOAD
    download: getDownloadInfo(response),
    
    // RESPUESTA RAW (completa de axios)
    raw: response,
    
    // STATUS HTTP
    status: response.status,
    
    // Verificar éxito
    success: response.status >= 200 && response.status < 300
  };
}

// Exportar ambas opciones
export { api };
export { apiNormalized };
export { api as apiRaw }; // Para requests que necesitan respuesta binaria
