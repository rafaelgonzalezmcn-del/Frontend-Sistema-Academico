import axios from 'axios';
import { toast } from './ToastService';

/**
 * Cliente HTTP "simple": devuelve la respuesta de axios tal cual
 * (response.data = cuerpo completo { data, meta, message }).
 * Las pantallas que lo usan muestran sus propios mensajes de error,
 * por eso aquí solo se maneja la sesión vencida.
 * Para el cliente con avisos automáticos ver apiNormalized.js.
 */
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
  },
  validateStatus: function (status) {
    return status >= 200 && status < 300;
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

// Sesión vencida o token inválido (401): volver al login.
// Antes estas pantallas fallaban en silencio cuando expiraba la sesión.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const esLogin = error.config?.url?.includes('/login');
    if (error.response?.status === 401 && !esLogin) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
