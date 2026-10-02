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
    // Respuesta: { message, data: { token, token_type, user } }
    // Si las credenciales son incorrectas, axios lanza el error (401) y lo
    // maneja el catch de Login.vue con error.response.data.message
    const response = await api.post('/login', credentials);
    const { user: usuario, token: nuevoToken } = response.data.data;

    user.value = usuario;

    if (nuevoToken) {
      localStorage.setItem('token', nuevoToken);
      token.value = nuevoToken;
    }

    return response.data.data;
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
      // Respuesta: { data: usuario }
      const response = await api.get('/me');
      user.value = response.data.data;
      return response.data.data;
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
