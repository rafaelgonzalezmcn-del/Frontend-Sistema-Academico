<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { apiNormalized } from '@/services/apiNormalized';

const props = defineProps({
  subjectId: {
    type: Number,
    required: true
  },
  sectionId: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['closed']);

// Estado
const isLoading = ref(true);
const isChecking = ref(true);
const isClosed = ref(false);
const error = ref('');
const success = ref('');

// Verificar estado del curso
const checkCourseStatus = async () => {
  isChecking.value = true;
  try {
    const response = await apiNormalized.get(`/subjects/${props.subjectId}/sections/${props.sectionId}/status`);
    isClosed.value = response.data.is_closed || false;
  } catch (e) {
    console.error('Error checking course status:', e);
    // Si falla, asumimos que no está cerrado
    isClosed.value = false;
  } finally {
    isChecking.value = false;
    isLoading.value = false;
  }
};

// Cerrar curso
const closeCourse = async () => {
  if (isClosed.value) return;
  
  error.value = '';
  success.value = '';
  isLoading.value = true;
  
  try {
    const response = await apiNormalized.post(`/subjects/${props.subjectId}/sections/${props.sectionId}/close`);
    
    success.value = response.data.message || 'Curso cerrado correctamente';
    isClosed.value = true;
    
    emit('closed', response.data);
    
    // Limpiar mensaje después de 3 segundos usando nextTick
    setTimeout(() => {
      success.value = '';
    }, 3000);
    
  } catch (e) {
    const status = e.response?.status;
    const message = e.response?.data?.message || 'Error al cerrar el curso';
    
    if (status === 422) {
      // Curso ya cerrado
      error.value = message;
      isClosed.value = true;
    } else {
      error.value = message;
    }
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  checkCourseStatus();
});
</script>

<template>
  <div class="close-course-btn">
    <!-- Verificando estado -->
    <div v-if="isChecking" class="checking-state">
      <span class="spinner-small"></span>
      <span>Verificando estado...</span>
    </div>

    <!-- Botón habilitado -->
    <button 
      v-else-if="!isClosed"
      @click="closeCourse"
      :disabled="isLoading"
      class="btn-close-course"
    >
      <span v-if="isLoading" class="spinner-small"></span>
      <span v-else>🔒</span>
      Cerrar Curso
    </button>

    <!-- Botón deshabilitado (curso cerrado) -->
    <button 
      v-else
      disabled
      class="btn-close-course disabled"
    >
      <span>✓</span>
      Curso ya cerrado
    </button>

    <!-- Mensaje de error -->
    <div v-if="error" class="message error">
      {{ error }}
    </div>

    <!-- Mensaje de éxito -->
    <div v-if="success" class="message success">
      {{ success }}
    </div>
  </div>
</template>

<style scoped>
.close-course-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.checking-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: #6b7280;
  font-size: 14px;
}

.btn-close-course {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close-course:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-close-course:disabled {
  cursor: not-allowed;
}

.btn-close-course.disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.message {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.message.error {
  background: #fee2e2;
  color: #991b1b;
}

.message.success {
  background: #d1fae5;
  color: #065f46;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
