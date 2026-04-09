/**
 * Helper para normalizar respuestas de API
 * Maneja tanto el formato antiguo como el nuevo estandarizado
 * 
 * Formato antiguo: { id: 1, name: "..." }
 * Formato nuevo:   { data: { id: 1, name: "..." }, message: "...", meta: {...} }
 */

/**
 * Extrae los datos de una respuesta, soportando ambos formatos
 * @param {any} response - Respuesta de axios o datos directos
 * @returns {any} - Los datos normalizados (el array u objeto real)
 */
export function getData(response) {
  // Si no hay respuesta, devolver null
  if (!response) return null;
  
  // Si ya es un array (formato antiguo directo)
  if (Array.isArray(response)) return response;
  
  // Si es un objeto simple sin propiedad data (respuesta directa)
  if (typeof response === 'object' && !('data' in response)) {
    return response;
  }
  
  // response tiene propiedad 'data'
  const innerData = response.data;
  
  // Si innerData es null o undefined
  if (innerData === null || innerData === undefined) {
    return null;
  }
  
  // Si innerData es un array (formato antiguo: axios.response.data = [...])
  if (Array.isArray(innerData)) {
    return innerData;
  }
  
  // Si innerData es un objeto con propiedad 'data' (formato nuevo: axios.response.data = {data: [...], meta: {...}})
  if (typeof innerData === 'object' && 'data' in innerData) {
    return innerData.data;
  }
  
  // Si innerData es un objeto simple (no tiene 'data'), devolverlo directo
  return innerData;
}

/**
 * Extrae los datos de una respuesta de lista (para paginación)
 * @param {any} response - Respuesta de axios
 * @returns {array} - Array de datos
 */
export function getListData(response) {
  const data = getData(response);
  
  // Si es array, devolver directo
  if (Array.isArray(data)) return data;
  
  // Si es objeto con propiedad data (respuesta paginada nueva)
  if (data && typeof data === 'object' && 'data' in data) {
    return data.data;
  }
  
  // Si es cualquier otra cosa, devolver como array o vacío
  return data ? [data] : [];
}

/**
 * Extrae el mensaje de una respuesta
 * @param {any} response - Respuesta de axios
 * @param {string} defaultMessage - Mensaje por defecto
 * @returns {string} - El mensaje
 */
export function getMessage(response, defaultMessage = '') {
  if (!response) return defaultMessage;
  
  // Buscar en response.data.message (formato nuevo)
  if (response.data?.message) {
    return response.data.message;
  }
  
  // Buscar en response.message (formato directo)
  if (response.message) {
    return response.message;
  }
  
  return defaultMessage;
}

/**
 * Extrae los metadatos de una respuesta
 * @param {any} response - Respuesta de axios
 * @returns {object} - Metadatos o objeto vacío
 */
export function getMeta(response) {
  if (!response) return {};
  
  // Buscar en response.data.meta (formato nuevo)
  if (response.data?.meta) {
    return response.data.meta;
  }
  
  // Buscar en response.meta (formato directo)
  if (response.meta) {
    return response.meta;
  }
  
  // Buscar en response.data para paginación legacy
  if (response.data) {
    const { data, ...metaRest } = response.data;
    // Si tiene propiedades de paginación
    if (metaRest.current_page !== undefined || metaRest.total !== undefined) {
      return metaRest;
    }
  }
  
  return {};
}

/**
 * Verifica si la respuesta indica éxito (no es error)
 * @param {any} response - Respuesta de axios
 * @returns {boolean}
 */
export function isSuccess(response) {
  if (!response) return false;
  
  // Axios successful response (status 2xx)
  if (response.status >= 200 && response.status < 300) {
    return true;
  }
  
  return false;
}

/**
 * Extrae datos para downloads (download_url, filename)
 * @param {any} response - Respuesta de axios
 * @returns {object} - { downloadUrl, filename }
 */
export function getDownloadInfo(response) {
  const data = getData(response);
  
  if (!data) {
    return { downloadUrl: null, filename: null };
  }
  
  return {
    downloadUrl: data.download_url || data.downloadUrl || null,
    filename: data.filename || data.nombre_archivo || null
  };
}

/**
 * Factory para crear función adaptadora con contexto
 * Útil cuando necesitas usar los helpers múltiples veces en un archivo
 * @param {object} response - Respuesta de axios
 * @returns {object} - Objeto con métodos helper
 */
export function createResponse(response) {
  return {
    /** @type {any} */
    raw: response,
    
    get data() {
      return getData(response);
    },
    
    get list() {
      return getListData(response);
    },
    
    get message() {
      return getMessage(response);
    },
    
    get meta() {
      return getMeta(response);
    },
    
    get download() {
      return getDownloadInfo(response);
    },
    
    get success() {
      return isSuccess(response);
    }
  };
}

export default {
  getData,
  getListData,
  getMessage,
  getMeta,
  isSuccess,
  getDownloadInfo,
  createResponse
};
