<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { login, isAuthenticated, user, fetchUser } = useAuth();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    await login({
      email: email.value,
      password: password.value,
    });
    
    // Redirigir según el rol
    if (isAuthenticated.value) {
      if (user.value?.role?.name === 'admin') {
        router.push('/admin');
      } else if (user.value?.role?.name === 'profesor') {
        router.push('/profesor');
      } else if (user.value?.role?.name === 'estudiante') {
        router.push('/estudiante');
      } else {
        router.push('/');
      }
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al iniciar sesión';
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  // Si hay token pero no usuario, cargar datos del usuario primero
  if (isAuthenticated.value && !user.value) {
    await fetchUser();
  }
  
  if (isAuthenticated.value && user.value) {
    if (user.value?.role?.name === 'admin') {
      router.push('/admin');
    } else if (user.value?.role?.name === 'profesor') {
      router.push('/profesor');
    } else if (user.value?.role?.name === 'estudiante') {
      router.push('/estudiante');
    } else {
      router.push('/');
    }
  }
});
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <h1>Sistema Académico</h1>
      <h2>Iniciar Sesión</h2>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Email</label>
          <input 
            v-model="email" 
            type="email" 
            required 
            placeholder="correo@ejemplo.com"
          />
        </div>
        
        <div class="form-group">
          <label>Contraseña</label>
          <div class="password-input-wrapper">
            <input 
              v-model="password" 
              :type="showPassword ? 'text' : 'password'" 
              required 
              placeholder="••••••••"
            />
            <button 
              type="button" 
              class="toggle-password"
              @click="showPassword = !showPassword"
            >
              <span v-if="showPassword">👁️</span>
              <span v-else>👁️‍🗨️</span>
            </button>
          </div>
        </div>
        
        <button type="submit" :disabled="loading" class="login-btn">
          {{ loading ? 'Cargando...' : 'Iniciar Sesión' }}
        </button>
        
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

h1 {
  text-align: center;
  color: #333;
  margin: 0 0 8px;
  font-size: 24px;
}

h2 {
  text-align: center;
  color: #666;
  margin: 0 0 24px;
  font-size: 16px;
  font-weight: normal;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 6px;
  color: #333;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #42b883;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper input {
  padding-right: 45px;
}

.toggle-password {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.toggle-password:hover {
  color: #333;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.login-btn:hover:not(:disabled) {
  background: #3aa876;
}

.login-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error {
  color: #e74c3c;
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
}
</style>
