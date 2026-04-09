<script setup>
import { ref, watch } from 'vue';
import { formatFileSize } from '@/utils/formatters';
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from '@/utils/constants';

const props = defineProps({
  show: Boolean,
  uploading: Boolean
});

const emit = defineEmits(['update:show', 'upload', 'close']);

const file = ref(null);
const fileName = ref('');
const description = ref('');

// Reset cuando se abre el modal
watch(() => props.show, (newVal) => {
  if (!newVal) {
    file.value = null;
    fileName.value = '';
    description.value = '';
  }
});

const handleFileSelect = (event) => {
  const selectedFile = event.target.files[0];
  if (!selectedFile) return;
  
  const fileExt = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
  
  if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
    alert('Solo se permiten archivos PDF, ZIP o Word');
    event.target.value = '';
    return;
  }
  
  if (selectedFile.size > MAX_FILE_SIZE) {
    alert('El archivo no puede superar 8MB');
    event.target.value = '';
    return;
  }
  
  file.value = selectedFile;
  if (!fileName.value) {
    fileName.value = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.'));
  }
};

const submit = () => {
  if (!file.value || !fileName.value.trim()) return;
  emit('upload', { 
    file: file.value, 
    name: fileName.value.trim(), 
    description: description.value.trim() 
  });
};

const close = () => {
  emit('update:show', false);
  emit('close');
};
</script>

<template>
  <div v-if="show" class="upload-form-overlay" @click.self="close">
    <div class="upload-form-modal">
      <div class="upload-form-header">
        <h3>Subir Archivo</h3>
        <button class="upload-form-close" @click="close">✕</button>
      </div>
      <div class="upload-form-body">
        <div class="form-group">
          <label>Nombre del archivo *</label>
          <input v-model="fileName" type="text" class="form-input" placeholder="Ej: Tema 1" />
        </div>
        <div class="form-group">
          <label>Descripción (opcional)</label>
          <textarea v-model="description" class="form-textarea" rows="3" placeholder="Breve descripción..."></textarea>
        </div>
        <div class="form-group">
          <label>Archivo *</label>
          <input 
            type="file" 
            id="file-input"
            accept=".pdf,.zip,.doc,.docx" 
            @change="handleFileSelect" 
            class="file-input-hidden"
          />
          <label for="file-input" class="file-select-btn">
            📁 Seleccionar archivo
          </label>
          <div v-if="file" class="file-selected">
            <span class="file-icon">📄</span>
            <span class="file-name">{{ file.name }}</span>
            <span class="file-size">({{ formatFileSize(file.size) }})</span>
          </div>
          <div v-else class="no-file">
            <small>No has seleccionado ningún archivo</small>
          </div>
        </div>
      </div>
      <div class="upload-form-footer">
        <button @click="close" class="btn-cancel">Cancelar</button>
        <button 
          @click="submit" 
          class="btn-submit" 
          :disabled="!file || !fileName.trim() || uploading"
        >
          {{ uploading ? 'Subiendo...' : 'Subir Archivo' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-input-hidden {
  display: none;
}

.file-select-btn {
  display: inline-block;
  padding: 10px 20px;
  background: #f0f9ff;
  border: 1px dashed #3b82f6;
  border-radius: 8px;
  color: #0369a1;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  margin-bottom: 10px;
}

.file-select-btn:hover {
  background: #e0f2fe;
  border-style: solid;
}

.file-selected {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: #f0fdf4;
  border: 1px solid #22c55e;
  border-radius: 6px;
  margin-top: 10px;
}

.no-file {
  color: #6b7280;
  font-size: 13px;
  margin-top: 5px;
}

.form-input, .form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-cancel {
  padding: 8px 16px;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  color: #374151;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-submit {
  padding: 8px 16px;
  background: #3b82f6;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
}

.btn-submit:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-submit:hover:not(:disabled) {
  background: #2563eb;
}
</style>
