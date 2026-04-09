import { ref, computed } from 'vue';
import { apiNormalized, api } from '../services/apiNormalized';

const user = ref(null);
const token = ref(localStorage.getItem('token') || null);
// Usar computed para que isAuthenticated siempre esté sincronizado con token
const isAuthenticated = computed(() => !!token.value && !!user.value);

export function useAuth() {
  const login = async (credentials) => {
    // Login es un endpoint especial que puede no usar API Resource
    // Usamos api raw para mantener compatibilidad
    const response = await api.post('/login', credentials);

    // validateStatus: true en apiNormalized hace que 4xx/5xx no lancen error.
    // Verificamos manualmente si la respuesta indica fallo.
    if (response.status >= 400) {
      throw response;
    }

    user.value = response.data.user;
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      token.value = response.data.token;
    }
    
    return response.data;
  };

  const logout = async () => {
    try {
      // Logout no devuelve datos, usamos api raw
      await api.post('/logout');
    } finally {
      user.value = null;
      token.value = null;
      localStorage.removeItem('token');
    }
  };

  const fetchUser = async () => {
    if (!token.value) return null;
    
    try {
      // /me puede devolver el usuario directamente sin wrapper
      // Usamos api raw para mantener compatibilidad
      const response = await api.get('/me');
      user.value = response.data;
      return response.data;
    } catch (error) {
      user.value = null;
      token.value = null;
      localStorage.removeItem('token');
      return null;
    }
  };

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    fetchUser,
  };
}
