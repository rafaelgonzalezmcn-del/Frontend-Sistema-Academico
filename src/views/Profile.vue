<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { apiNormalized as api, api as apiRaw } from '../services/apiNormalized';
import HistorialAcademico from './student/HistorialAcademico.vue';
import { useSelfie } from '../composables/useSelfie';

// Router
const route = useRoute();
const router = useRouter();
const { user } = useAuth();

// ==================== ESTADO ====================
const loading = ref(true);
const error = ref('');
const success = ref('');

// Vistas de contraseña
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

// Usuario que se está viendo
const viewUser = ref(null);
const viewUserSelfieUrl = ref(null);

// Formulario
const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  current_password: '',
  new_password: '',
  confirm_password: ''
});

// ==================== SELFIE COMPOSABLE ====================
const {
  selfieFile,
  uploadingSelfie,
  showCropperModal,
  userHasSelfie,
  selfieBlobUrl,
  showDeleteConfirm,
  cropperState,
  cropperImageSrc,
  cropperImageRef,
  cropperWrapperRef,
  checkSelfie: loadSelfie,
  handleSelfieSelect,
  prepareCropper,
  confirmCrop,
  cancelCrop,
  uploadSelfie,
  deleteSelfie
} = useSelfie({
  onSuccess: (msg) => { success.value = msg; },
  onError: (msg) => { error.value = msg; }
});

// ==================== COMPUTED ====================
const isViewOnly = computed(() => {
  const userId = route.params.id;
  if (!userId) return false;
  return parseInt(userId) !== user.value?.id;
});

const displayUser = computed(() => {
  if (isViewOnly.value && viewUser.value) {
    return viewUser.value;
  }
  return user.value;
});

const showBackButton = computed(() => true);

// Cargar selfie del usuario que se está viendo
const loadViewUserSelfie = async (userId) => {
  if (!userId) return null;
  try {
    const response = await apiRaw.get(`/users/${userId}/selfie`, { responseType: 'blob' });
    if (response.data && response.data.size > 0) {
      return URL.createObjectURL(response.data);
    }
  } catch (e) {
    // No tiene selfie
  }
  return null;
};

// ==================== CICLO DE VIDA ====================
onMounted(async () => {
  // Limpiar mensajes al montar
  error.value = '';
  success.value = '';

  if (isViewOnly.value) {
    // Cargar datos del usuario externo
    try {
      const response = await api.get(`/users/${route.params.id}`);
      viewUser.value = response.data;
      
      // Cargar selfie si tiene
      if (response.data.has_selfie) {
        const selfieUrl = await loadViewUserSelfie(route.params.id);
        viewUserSelfieUrl.value = selfieUrl;
      }
      
      form.value = {
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      };
    } catch (e) {
      error.value = 'Usuario no encontrado';
    }
  }

  if (user.value && !isViewOnly.value) {
    // Cargar datos del propio usuario
    form.value = {
      first_name: user.value.first_name || '',
      last_name: user.value.last_name || '',
      email: user.value.email || '',
      phone: user.value.phone || '',
      current_password: '',
      new_password: '',
      confirm_password: ''
    };

    // Verificar si tiene selfie
    await loadSelfie();
  }

  loading.value = false;
});

// Auto-limpiar mensajes después de 5 segundos
watch(error, (val) => {
  if (val) setTimeout(() => { error.value = ''; }, 5000);
});

watch(success, (val) => {
  if (val) setTimeout(() => { success.value = ''; }, 5000);
});

// ==================== GUARDAR PERFIL ====================
const saveProfile = async () => {
  loading.value = true;
  error.value = '';
  success.value = '';

  try {
    const data = {
      first_name: form.value.first_name,
      last_name: form.value.last_name,
      email: form.value.email,
      phone: form.value.phone
    };

    // Solo cambiar contraseña si se proporcionan los 3 campos
    if (form.value.current_password && form.value.new_password && form.value.confirm_password) {
      if (form.value.new_password !== form.value.confirm_password) {
        error.value = 'Las contraseñas no coinciden';
        loading.value = false;
        return;
      }
      data.current_password = form.value.current_password;
      data.new_password = form.value.new_password;
      data.new_password_confirmation = form.value.confirm_password;
    }

    const response = await api.put('/profile', data);
    success.value = response.message || 'Perfil actualizado correctamente';

    // Actualizar store de auth
    if (response.data) {
      user.value = response.data;
    }

    // Limpiar campos de contraseña
    form.value.current_password = '';
    form.value.new_password = '';
    form.value.confirm_password = '';

  } catch (e) {
    error.value = e.response?.data?.message || 'Error al actualizar el perfil';
  } finally {
    loading.value = false;
  }
};

// ==================== SELFIE: CONFIRMAR CROP ====================
const onConfirmCrop = async () => {
  await confirmCrop();
  // Auto-subir después de crop
  await uploadSelfie();
};

// ==================== SELFIE: ELIMINAR ====================
const confirmDeleteSelfie = async () => {
  showDeleteConfirm.value = false;
  await deleteSelfie();
};

// ==================== UTILIDADES ====================
const handleFileChange = (event) => {
  error.value = '';
  success.value = '';
  handleSelfieSelect(event);
};

const onCropperImageLoad = () => {
  prepareCropper();
};
</script>

<template>
  <div class="profile-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <button v-if="showBackButton" @click="router.back()" class="btn-back">
          ← Volver
        </button>
        <h2>{{ isViewOnly ? 'Perfil de Usuario' : 'Mi Perfil' }}</h2>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">Cargando...</div>

    <!-- Contenido Principal -->
    <div v-else class="profile-container">
      <div class="profile-card">
        <!-- Header con Avatar -->
        <div class="profile-header">
          <div class="avatar-container">
            <!-- Selfie cargada del propio usuario -->
            <img 
              v-if="userHasSelfie && !isViewOnly" 
              :src="selfieBlobUrl" 
              alt="Tu selfie" 
              class="avatar-img"
              @error="userHasSelfie = false"
            />
            <!-- Selfie del usuario que se está viendo -->
            <img 
              v-else-if="isViewOnly && viewUserSelfieUrl" 
              :src="viewUserSelfieUrl" 
              alt="Foto de perfil" 
              class="avatar-img"
            />
            <!-- Avatar por defecto -->
            <div v-else class="avatar">
              {{ displayUser?.first_name?.charAt(0) }}{{ displayUser?.last_name?.charAt(0) }}
            </div>
            
            <!-- Botón subir selfie -->
            <label 
              v-if="!isViewOnly && !userHasSelfie" 
              class="avatar-upload-btn" 
              for="selfie-input"
            >
              📷
            </label>
            
            <!-- Botón eliminar selfie -->
            <button 
              v-if="userHasSelfie && !isViewOnly" 
              class="avatar-delete-btn" 
              @click="showDeleteConfirm = true"
              title="Eliminar selfie"
            >
              ✕
            </button>

            <!-- Input file oculto -->
            <input 
              id="selfie-input" 
              type="file" 
              accept="image/jpeg,image/png" 
              @change="handleFileChange" 
              style="display: none"
            />
          </div>
          
          <div class="user-info">
            <h3>{{ displayUser?.first_name }} {{ displayUser?.last_name }}</h3>
            <span class="role-badge">{{ displayUser?.role?.name }}</span>
          </div>
        </div>

        <!-- Formulario -->
        <form @submit.prevent="saveProfile" class="profile-form">
          <!-- Mensajes -->
          <div v-if="error" class="message error-message">{{ error }}</div>
          <div v-if="success" class="message success-message">{{ success }}</div>
          
          <!-- Datos personales -->
          <div class="form-row">
            <div class="form-group">
              <label>Nombre *</label>
              <input v-model="form.first_name" :disabled="isViewOnly" required />
            </div>
            <div class="form-group">
              <label>Apellido</label>
              <input v-model="form.last_name" :disabled="isViewOnly" />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Email *</label>
              <input v-model="form.email" type="email" :disabled="isViewOnly" required />
            </div>
            <div class="form-group">
              <label>Teléfono</label>
              <input v-model="form.phone" :disabled="isViewOnly" />
            </div>
          </div>
          
          <!-- Cambio de contraseña (solo propio perfil) -->
          <div v-if="!isViewOnly">
            <div class="divider">
              <span>Cambiar contraseña</span>
            </div>
            
            <div class="form-group">
              <label>Contraseña actual</label>
              <div class="password-input-wrapper">
                <input 
                  v-model="form.current_password" 
                  :type="showCurrentPassword ? 'text' : 'password'" 
                  placeholder="Dejar en blanco si no cambiar" 
                />
                <button 
                  type="button" 
                  class="toggle-password"
                  @click="showCurrentPassword = !showCurrentPassword"
                >
                  {{ showCurrentPassword ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Nueva contraseña</label>
                <div class="password-input-wrapper">
                  <input 
                    v-model="form.new_password" 
                    :type="showNewPassword ? 'text' : 'password'" 
                    placeholder="Mínimo 6 caracteres" 
                  />
                  <button 
                    type="button" 
                    class="toggle-password"
                    @click="showNewPassword = !showNewPassword"
                  >
                    {{ showNewPassword ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label>Confirmar contraseña</label>
                <div class="password-input-wrapper">
                  <input 
                    v-model="form.confirm_password" 
                    :type="showConfirmPassword ? 'text' : 'password'" 
                  />
                  <button 
                    type="button" 
                    class="toggle-password"
                    @click="showConfirmPassword = !showConfirmPassword"
                  >
                    {{ showConfirmPassword ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Botón guardar -->
          <div class="form-actions" v-if="!isViewOnly">
            <button type="submit" class="btn-primary" :disabled="loading">
              <span v-if="loading">Guardando...</span>
              <span v-else>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Modal Cropper -->
      <div v-if="showCropperModal" class="modal-overlay" @click.self="cancelCrop">
        <div class="cropper-modal">
          <div class="cropper-header">
            <h3>Ajustar foto de perfil</h3>
            <button class="close-btn" @click="cancelCrop">✕</button>
          </div>
          
          <div class="cropper-body">
            <div ref="cropperWrapperRef" class="cropper-wrapper">
              <img 
                v-if="selfieFile" 
                ref="cropperImageRef"
                :src="cropperImageSrc" 
                alt="Imagen a_recortar"
                class="cropper-image"
                @load="onCropperImageLoad"
                draggable="false"
              />
              <!-- Indicador círculo -->
              <div class="cropper-circle"></div>
            </div>
            
            <div class="cropper-instructions">
              <p>🖱️ Arrastra para mover</p>
              <p>🔍 Rueda del mouse para zoom</p>
            </div>
          </div>
          
          <div class="cropper-footer">
            <button type="button" class="btn btn-secondary" @click="cancelCrop">
              Cancelar
            </button>
            <button 
              type="button" 
              class="btn btn-primary" 
              @click="onConfirmCrop"
              :disabled="uploadingSelfie"
            >
              <span v-if="uploadingSelfie">Subiendo...</span>
              <span v-else>Confirmar y subir</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Confirmar Eliminación -->
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="confirm-dialog">
          <h3>¿Eliminar selfie?</h3>
          <p>¿Estás seguro de que quieres eliminar tu foto de perfil?</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" @click="showDeleteConfirm = false">
              Cancelar
            </button>
            <button class="btn btn-danger" @click="confirmDeleteSelfie">
              Eliminar
            </button>
          </div>
        </div>
      </div>

      <!-- Historial Académico (solo estudiantes) -->
      <div v-if="displayUser?.role?.name === 'estudiante'" class="history-section">
        <h3 class="section-title">Historial Académico</h3>
        <HistorialAcademico :student-id="displayUser?.id" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==================== LAYOUT ==================== */
.profile-view {
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 30px;
  width: 100%;
  max-width: 800px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-container {
  width: 100%;
  max-width: 800px;
}

/* ==================== HEADER ==================== */
.btn-back {
  background: #f3f4f6;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  transition: background 0.2s;
}

.btn-back:hover {
  background: #e5e7eb;
}

.page-header h2 {
  margin: 0;
  color: #2c3e50;
}

/* ==================== CARD ==================== */
.profile-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  overflow: hidden;
}

.profile-header {
  background: linear-gradient(135deg, #42b883 0%, #3aa876 100%);
  padding: 30px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info h3 {
  margin: 0 0 8px;
  color: white;
  font-size: 24px;
}

.role-badge {
  background: rgba(255,255,255,0.2);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  text-transform: capitalize;
}

/* ==================== AVATAR ==================== */
.avatar-container {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}

.avatar {
  width: 80px;
  height: 80px;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
  color: white;
}

.avatar-img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255,255,255,0.3);
}

.avatar-upload-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 28px;
  height: 28px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: transform 0.2s;
}

.avatar-upload-btn:hover {
  transform: scale(1.1);
}

.avatar-delete-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 28px;
  height: 28px;
  background: #ef4444;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: white;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: transform 0.2s;
}

.avatar-delete-btn:hover {
  transform: scale(1.1);
  background: #dc2626;
}

/* ==================== FORMULARIO ==================== */
.profile-form {
  padding: 30px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.form-group input:disabled {
  background: #f9fafb;
  color: #6b7280;
}

/* ==================== MENSAJES ==================== */
.message {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.success-message {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

/* ==================== DIVISOR ==================== */
.divider {
  text-align: center;
  margin: 24px 0;
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #eee;
}

.divider span {
  background: white;
  padding: 0 16px;
  color: #666;
  font-size: 14px;
  position: relative;
}

/* ==================== PASSWORD ==================== */
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
  color: #666;
}

.toggle-password:hover {
  color: #333;
}

/* ==================== BOTONES ==================== */
.form-actions {
  margin-top: 30px;
  text-align: right;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #42b883;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #3aa876;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f3f4f6;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

/* ==================== LOADING ==================== */
.loading {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

/* ==================== MODALES ==================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* Cropper Modal */
.cropper-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.cropper-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.cropper-header h3 {
  margin: 0;
  font-size: 18px;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
}

.cropper-body {
  padding: 20px;
}

.cropper-wrapper {
  position: relative;
  width: 100%;
  height: 300px;
  background: #f3f4f6;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cropper-image {
  position: absolute;
  max-width: 100%;
  max-height: 100%;
  /* Estilos se setean desde JS */
}

.cropper-circle {
  position: absolute;
  width: 200px;
  height: 200px;
  border: 3px dashed rgba(59, 130, 246, 0.7);
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
}

.cropper-instructions {
  margin-top: 16px;
  text-align: center;
  color: #6b7280;
  font-size: 13px;
}

.cropper-instructions p {
  margin: 4px 0;
}

.cropper-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 0 0 16px 16px;
}

/* Confirm Dialog */
.confirm-dialog {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 350px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.confirm-dialog h3 {
  margin: 0 0 12px;
  color: #1f2937;
}

.confirm-dialog p {
  margin: 0 0 20px;
  color: #6b7280;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* ==================== HISTORIAL ==================== */
.history-section {
  margin-top: 30px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 600px) {
  .profile-view {
    padding: 16px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .profile-header {
    flex-direction: column;
    text-align: center;
  }
  
  .user-info {
    width: 100%;
  }
}
</style>