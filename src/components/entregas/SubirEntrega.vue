<template>
  <div class="subir-entrega">
    <div v-if="!tarea" class="alert alert-warning">
      Tarea no encontrada
    </div>
    
    <div v-else>
      <!-- Entrega realizada -->
      <div v-if="miEntrega" class="entrega-realizada">
        <div class="entrega-header">
          <span class="entrega-icon">✓</span>
          <span class="entrega-titulo">Entrega realizada</span>
        </div>
        
        <div class="entrega-info">
          <div class="entrega-fecha-box">
            <span class="fecha-label">📅 Fecha de entrega:</span>
            <span class="fecha-valor">{{ formatDate(miEntrega.fecha_entrega) }}</span>
          </div>
          
          <div class="entrega-archivo-box">
            <span class="archivo-label">📎 Archivo:</span>
            <a :href="miEntrega.download_url" target="_blank" class="archivo-link">
              {{ miEntrega.filename }}
            </a>
          </div>
        </div>
        
        <!-- Mensaje de tiempo antes/después -->
        <div v-if="mensajeDiferencia" class="entrega-tiempo" :class="esTarde ? 'tiempo-tarde' : 'tiempo-antes'">
          <span class="tiempo-icon">{{ esTarde ? '⚠️' : '✅' }}</span>
          <span class="tiempo-text">La tarea fue enviada {{ mensajeDiferencia }} de la fecha límite</span>
        </div>
        
        <!-- Botón de borrar - solo si la fecha límite no ha pasado -->
        <div v-if="!tareaVencida" class="entrega-acciones">
          <button @click="intentarBorrar" class="btn-borrar">
            🗑️ Borrar entrega
          </button>
        </div>
        <div v-else class="entrega-observacion">
          <span class="observacion-text">No puedes cancelar esta entrega porque la fecha límite ya pasó.</span>
        </div>
      </div>
      
      <!-- Sin entrega -->
      <div v-else>
        <!-- Si la tarea está vencida, mostrar aviso -->
        <div v-if="tareaVencida" class="alert alert-warning">
          ⚠️ La fecha límite de esta tarea ha vencido. Puedes entregar pero no podrás cancelar después.
        </div>
        
        <button @click="showForm = true" class="btn btn-primary">
          📤 Subir Entrega
        </button>
        
        <form v-if="showForm" @submit.prevent="onSubmit" enctype="multipart/form-data" class="form-subir">
          <!-- Área de drag & drop o selección -->
          <div 
            class="upload-zone"
            :class="{ 'has-file': selectedFile }"
            @click="triggerFileInput"
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="handleDrop"
          >
            <input 
              ref="fileInput"
              type="file" 
              class="file-input-hidden"
              @change="onFileChange"
              :disabled="isSubmitting"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.ppt,.pptx,.rar,.jpg,.jpeg,.png"
            >
            
            <div v-if="!selectedFile" class="upload-placeholder">
              <div class="upload-icon">📁</div>
              <p class="upload-text">Arrastra tu archivo aquí</p>
              <p class="upload-subtext">o haz clic para seleccionar</p>
            </div>
            
            <div v-else class="file-selected">
              <div class="file-icon">📄</div>
              <div class="file-info">
                <p class="file-name">{{ selectedFile.name }}</p>
                <p class="file-size">{{ formatFileSize(selectedFile.size) }}</p>
              </div>
              <button type="button" @click.stop="clearFile" class="btn-remove-file" title="Eliminar archivo">
                ✕
              </button>
            </div>
          </div>
          
          <p class="formatos-permitidos">
            Formatos: PDF, DOC, DOCX, XLS, XLSX, ZIP, PPT, PPTX, RAR, JPG, PNG (máx. 10MB)
          </p>
          
          <div v-if="error" class="alert-error">{{ error }}</div>
          <div v-if="success" class="alert-success">{{ success }}</div>
          
          <div class="form-actions">
            <button type="button" @click="showForm = false" class="btn-cancel">
              Cancelar
            </button>
            <button 
              type="submit" 
              class="btn-submit"
              :disabled="!selectedFile || isSubmitting"
            >
              <span v-if="isSubmitting" class="spinner"></span>
              {{ isSubmitting ? 'Subiendo...' : '📤 Subir Entrega' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Modal de confirmación -->
    <div v-if="showConfirmDelete" class="modal-overlay" @click="showConfirmDelete = false">
      <div class="modal-content" @click.stop>
        <h4>Confirmar eliminación</h4>
        <p>¿Estás seguro que deseas borrar la entrega de la tarea "{{ tarea?.titulo }}"?</p>
        <p class="text-muted">Esta acción no se puede deshacer.</p>
        
        <!-- Mensaje de error si no se puede eliminar -->
        <div v-if="errorNoEliminar" class="error-no-eliminar">
          {{ errorNoEliminar }}
        </div>
        
        <div class="modal-actions">
          <button @click="showConfirmDelete = false; errorNoEliminar = ''" class="btn btn-secondary">Cancelar</button>
          <button @click="eliminarEntrega" class="btn btn-danger" :disabled="isDeleting">
            {{ isDeleting ? 'Eliminando...' : 'Sí, eliminar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useAuth } from '@/composables/useAuth';
import EntregaService from '@/services/EntregaService';

const { isAuthenticated, user } = useAuth();
const props = defineProps({
  tareaId: {
    type: Number,
    required: true
  },
  tareaData: {
    type: Object,
    default: null
  }
});

const tarea = ref(null);
const miEntrega = ref(null);
const selectedFile = ref(null);
const isSubmitting = ref(false);
const isDeleting = ref(false);
const error = ref('');
const errorNoEliminar = ref('');
const success = ref('');
const showForm = ref(false);
const showConfirmDelete = ref(false);
const fileInput = ref(null);
const dragOver = ref(false);

// Computed properties
const tareaVencida = computed(() => {
  if (!tarea.value?.fecha_limite) return false;
  return new Date(tarea.value.fecha_limite) < new Date();
});

const esTarde = computed(() => {
  if (!miEntrega.value?.fecha_entrega || !tarea.value?.fecha_limite) return false;
  return new Date(miEntrega.value.fecha_entrega) > new Date(tarea.value.fecha_limite);
});

const puedeCancelar = computed(() => {
  // Solo puede cancelar si la entrega fue antes de la fecha límite
  return !esTarde.value;
});

// Calcular la diferencia de tiempo
const mensajeDiferencia = computed(() => {
  if (!miEntrega.value?.fecha_entrega || !tarea.value?.fecha_limite) return '';
  
  const fechaEntrega = new Date(miEntrega.value.fecha_entrega);
  const fechaLimite = new Date(tarea.value.fecha_limite);
  const diffMs = fechaEntrega - fechaLimite;
  const diffAbsMs = Math.abs(diffMs);
  
  const diffMinutes = Math.floor(diffAbsMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  const remainingHours = diffHours % 24;
  const remainingMinutes = diffMinutes % 60;
  
  let mensaje = '';
  
  if (diffMs > 0) {
    // Tarde
    if (diffDays > 0) {
      mensaje = `${diffDays} día${diffDays > 1 ? 's' : ''} con ${remainingHours} hora${remainingHours !== 1 ? 's' : ''} tarde`;
    } else if (diffHours > 0) {
      mensaje = `${diffHours} hora${diffHours !== 1 ? 's' : ''} con ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''} tarde`;
    } else {
      mensaje = `${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''} tarde`;
    }
  } else {
    // Antes
    if (diffDays > 0) {
      mensaje = `${diffDays} día${diffDays > 1 ? 's' : ''} con ${remainingHours} hora${remainingHours !== 1 ? 's' : ''} antes`;
    } else if (diffHours > 0) {
      mensaje = `${diffHours} hora${diffHours !== 1 ? 's' : ''} con ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''} antes`;
    } else {
      mensaje = `${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''} antes`;
    }
  }
  
  return mensaje;
});

const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('es-ES', options);
};

const onFileChange = (e) => {
  selectedFile.value = e.target.files[0];
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleDrop = (e) => {
  dragOver.value = false;
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    selectedFile.value = files[0];
  }
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

const clearFile = () => {
  selectedFile.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const onSubmit = async () => {
  if (!selectedFile.value) {
    error.value = 'Por favor selecciona un archivo';
    return;
  }

  isSubmitting.value = true;
  error.value = '';
  success.value = '';

  try {
    const formData = new FormData();
    formData.append('archivo', selectedFile.value);

    const response = await EntregaService.subirEntrega(props.tareaId, formData);

    if (response.data.success || response.status === 201) {
      success.value = response.data.message || 'Entrega subida correctamente';
      // Recargar la entrega para mostrarla
      await cargarMiEntrega();
      // Cerrar el formulario después de subir exitosamente
      showForm.value = false;
      selectedFile.value = null;
    } else {
      error.value = response.data.message || 'Error al subir la entrega';
    }
  } catch (err) {
    console.error('Error al subir entrega:', err);
    error.value = err.response?.data?.message || 'Error al subir la entrega. Por favor intenta de nuevo.';
  } finally {
    isSubmitting.value = false;
  }
};

const confirmarBorrar = () => {
  showConfirmDelete.value = true;
};

const intentarBorrar = () => {
  errorNoEliminar.value = '';
  
  if (!puedeCancelar.value) {
    // Calcular cuánto tiempo después
    if (miEntrega.value?.fecha_entrega && tarea.value?.fecha_limite) {
      const fechaEntrega = new Date(miEntrega.value.fecha_entrega);
      const fechaLimite = new Date(tarea.value.fecha_limite);
      const diffMs = fechaEntrega - fechaLimite;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        errorNoEliminar.value = `No puedes eliminar esta entrega porque fue enviada ${diffHours} hora${diffHours !== 1 ? 's' : ''} y ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''} después de la fecha límite.`;
      } else {
        errorNoEliminar.value = `No puedes eliminar esta entrega porque fue enviada ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''} después de la fecha límite.`;
      }
    } else {
      errorNoEliminar.value = 'No puedes eliminar esta entrega porque fue enviada después de la fecha límite.';
    }
    // Mostrar el modal con el mensaje de error
    showConfirmDelete.value = true;
    return;
  }
  
  showConfirmDelete.value = true;
};

const eliminarEntrega = async () => {
  if (!miEntrega.value?.id) return;
  
  isDeleting.value = true;
  error.value = '';
  errorNoEliminar.value = '';
  
  try {
    await EntregaService.eliminarEntrega(miEntrega.value.id);
    miEntrega.value = null;
    showConfirmDelete.value = false;
    success.value = 'Entrega eliminada correctamente';
  } catch (err) {
    console.error('Error al eliminar entrega:', err);
    const mensaje = err.response?.data?.message || 'Error al eliminar la entrega';
    errorNoEliminar.value = mensaje;
  } finally {
    isDeleting.value = false;
  }
};

const cargarTarea = async () => {
  try {
    // Si se pasa la tarea como prop, usarla
    if (props.tareaData) {
      tarea.value = props.tareaData;
    } else {
      tarea.value = { id: props.tareaId, titulo: `Tarea #${props.tareaId}` };
    }
    await cargarMiEntrega();
  } catch (err) {
    console.error('Error al cargar tarea:', err);
    tarea.value = null;
  }
};

const cargarMiEntrega = async () => {
  // Si tareaData ya tiene mi_entrega (del endpoint principal), usarla
  if (props.tareaData?.mi_entrega) {
    const entrega = props.tareaData.mi_entrega;
    miEntrega.value = {
      ...entrega,
      id: entrega.id,
      fecha_entrega: entrega.fecha_entrega,
      download_url: entrega.archivo_url || `${import.meta.env.VITE_API_URL || ''}/storage/${entrega.archivo}`,
      filename: entrega.archivo?.split('/').pop() || 'archivo'
    };
    return;
  }

  // Fallback: intentar llamar al endpoint /mi-entrega (solo si es estudiante)
  try {
    const response = await EntregaService.obtenerMiEntrega(props.tareaId);
    if (response.status === 200 && response.data.data) {
      miEntrega.value = {
        ...response.data.data,
        id: response.data.data.id,
        fecha_entrega: response.data.data.fecha_entrega,
        download_url: response.data.data.archivo_url || `${import.meta.env.VITE_API_URL || ''}/storage/${response.data.data.archivo}`,
        filename: response.data.data.archivo?.split('/').pop() || 'archivo'
      };
    } else {
      miEntrega.value = null;
    }
  } catch (err) {
    // 404 es normal - no tiene entrega
    miEntrega.value = null;
  }
};

// Watch for changes in tareaData prop
watch(() => props.tareaData, (newTareaData) => {
  if (newTareaData) {
    tarea.value = newTareaData;
  }
}, { immediate: true });

// Inicialización
onMounted(() => {
  cargarTarea();
});
</script>

<style scoped>
.subir-entrega {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.subir-entrega h3 {
  color: #495057;
  margin-bottom: 20px;
  text-align: center;
  display: none; /* Ocultar ya que ahora se muestra en la tarjeta de tarea */
}

.entrega-realizada {
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 12px;
  padding: 16px;
}

.entrega-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #bbf7d0;
}

.entrega-icon {
  font-size: 20px;
}

.entrega-titulo {
  font-weight: 700;
  color: #166534;
  font-size: 16px;
}

.entrega-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.entrega-fecha-box,
.entrega-archivo-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fecha-label,
.archivo-label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.fecha-valor {
  color: #1f2937;
}

.archivo-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.archivo-link:hover {
  text-decoration: underline;
}

.entrega-tarde {
  color: #ff9900;
  font-weight: 500;
  margin: 10px 0 0 0;
}

.entrega-tiempo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.entrega-tiempo.tiempo-tarde {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.entrega-tiempo.tiempo-antes {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
}

.tiempo-icon {
  font-size: 16px;
}

.tiempo-text {
  flex: 1;
}

.entrega-acciones {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #bbf7d0;
}

.btn-borrar {
  padding: 8px 16px;
  border: 1px solid #fecaca;
  border-radius: 6px;
  background: #fef2f2;
  color: #dc2626;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-borrar:hover {
  background: #fee2e2;
  border-color: #fca5a5;
}

.entrega-observacion {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #bbf7d0;
}

.observacion-text {
  color: #6b7280;
  font-size: 13px;
  font-style: italic;
}

.error-no-eliminar {
  background-color: rgba(220, 53, 69, 0.15);
  border: 1px solid rgba(220, 53, 69, 0.5);
  border-radius: 6px;
  padding: 12px 15px;
  color: #842029;
  margin-top: 10px;
  font-weight: 500;
}

.btn-danger {
  background-color: #dc3545;
  border-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #bb2d3b;
  border-color: #bb2d3b;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  max-width: 400px;
  width: 90%;
}

.modal-content h4 {
  margin: 0 0 15px 0;
  color: #dc3545;
}

.modal-content p {
  margin: 0 0 10px 0;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

/* Formulario de subida */
.form-subir {
  margin-top: 20px;
}

.upload-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 30px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8fafc;
}

.upload-zone:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.upload-zone.drag-over {
  border-color: #3b82f6;
  background: #dbeafe;
}

.upload-zone.has-file {
  border-style: solid;
  border-color: #22c55e;
  background: #f0fdf4;
  padding: 15px 20px;
}

.file-input-hidden {
  display: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.upload-text {
  color: #475569;
  font-weight: 500;
  margin: 0;
  font-size: 16px;
}

.upload-subtext {
  color: #94a3b8;
  margin: 5px 0 0 0;
  font-size: 14px;
}

.file-selected {
  display: flex;
  align-items: center;
  gap: 15px;
}

.file-icon {
  font-size: 36px;
}

.file-info {
  flex: 1;
  text-align: left;
}

.file-name {
  color: #1e293b;
  font-weight: 500;
  margin: 0;
  font-size: 14px;
  word-break: break-all;
}

.file-size {
  color: #64748b;
  margin: 3px 0 0 0;
  font-size: 12px;
}

.btn-remove-file {
  background: #fee2e2;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #dc2626;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-remove-file:hover {
  background: #fecaca;
}

.formatos-permitidos {
  color: #94a3b8;
  font-size: 12px;
  margin: 12px 0 0 0;
}

.alert-error {
  background-color: rgba(220, 53, 69, 0.15);
  border: 1px solid rgba(220, 53, 69, 0.4);
  border-radius: 6px;
  padding: 12px;
  color: #842029;
  margin-top: 15px;
  font-size: 14px;
}

.alert-success {
  background-color: rgba(25, 135, 84, 0.15);
  border: 1px solid rgba(25, 135, 84, 0.4);
  border-radius: 6px;
  padding: 12px;
  color: #0f5132;
  margin-top: 15px;
  font-size: 14px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-cancel {
  padding: 10px 20px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #64748b;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.btn-submit {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>