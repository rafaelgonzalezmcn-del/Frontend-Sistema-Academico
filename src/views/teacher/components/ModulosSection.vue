<script setup>
const props = defineProps({
  modulos: {
    type: Array,
    default: () => []
  },
  modulosColapsados: {
    type: Object,
    default: () => ({})
  },
  loading: Boolean,
  showAddModule: Boolean,
  newModuleName: String,
  newModuleDescription: String,
  savingModule: Boolean,
  editingModuleId: Number,
  editingModuleName: String,
  editingModuleDescription: String,
  savingEdit: Boolean,
  materialCounts: {
    type: Object,
    default: () => ({})
  },
  materiaId: Number
});

const emit = defineEmits([
  'update:newModuleName',
  'update:newModuleDescription',
  'update:showAddModule',
  'toggle-modulo',
  'create-module',
  'start-edit',
  'save-edit',
  'cancel-edit',
  'delete-module',
  'view-material',
  'delete-material',
  'show-upload-modal',
  'update:editingModuleName',
  'update:editingModuleDescription',
  'file-selected'
]);

// Format file size
const formatFileSize = (tamano) => {
  if (!tamano) return '0 KB';
  return Math.round(tamano / 1024) + ' KB';
};
</script>

<template>
  <section class="modules-section">
    <!-- Grid de módulos -->
    <div class="modules-grid">
      <!-- Cards de módulos existentes -->
      <div 
        v-for="modulo in modulos" 
        :key="modulo.id" 
        class="module-card"
        :id="'modulo-' + modulo.id"
      >
        <!-- Header del módulo -->
        <div class="module-header">
          <!-- Modo edición -->
          <div v-if="editingModuleId === modulo.id" class="edit-mode">
            <div class="edit-fields">
              <input 
                :value="editingModuleName"
                @input="$emit('update:editingModuleName', $event.target.value)"
                type="text" 
                class="edit-input"
                placeholder="Nombre del módulo"
                @keyup.enter="$emit('save-edit', modulo.id)"
                @keyup.escape="$emit('cancel-edit')"
                autofocus
              />
              <input 
                :value="editingModuleDescription"
                @input="$emit('update:editingModuleDescription', $event.target.value)"
                type="text" 
                class="edit-input"
                placeholder="Descripción (opcional)"
                @keyup.enter="$emit('save-edit', modulo.id)"
              />
            </div>
            <div class="edit-actions">
              <button @click="$emit('save-edit', modulo.id)" class="btn-icon save" :disabled="savingEdit">
                ✓
              </button>
              <button @click="$emit('cancel-edit')" class="btn-icon cancel">✕</button>
            </div>
          </div>
          
          <!-- Modo visualización -->
          <div v-else class="view-mode">
            <button 
              class="toggle-btn"
              @click="$emit('toggle-modulo', modulo.id)"
            >
              <span class="toggle-arrow" :class="{ collapsed: modulosColapsados[modulo.id] }">▼</span>
            </button>
            <div class="module-title-section">
              <h3 class="module-title">
                📦 {{ modulo.nombre }}
                <span class="material-count">({{ materialCounts[modulo.id] || 0 }} archivos)</span>
              </h3>
              <p v-if="modulo.descripcion" class="module-description">
                {{ modulo.descripcion }}
              </p>
            </div>
            <div class="module-actions">
              <button @click="$emit('start-edit', modulo)" class="btn-icon edit" title="Editar">
                ✏️
              </button>
              <button @click="$emit('delete-module', modulo.id)" class="btn-icon delete" title="Eliminar">
                🗑️
              </button>
            </div>
          </div>
        </div>

        <!-- Lista de materiales (colapsable) -->
        <div :class="['module-content', { 'content-collapsed': modulosColapsados[modulo.id] }]">
          <div class="materials-list">
            <div 
              v-for="material in modulo.materiales" 
              :key="material.id" 
              class="material-item"
            >
              <div class="material-info" @click="$emit('view-material', material)">
                <div class="material-main">
                  <span class="material-icon">📄</span>
                  <span class="material-name">{{ material.nombre_archivo }}</span>
                  <span class="material-size">({{ formatFileSize(material.tamano) }})</span>
                </div>
                <div v-if="material.descripcion" class="material-descripcion">
                  {{ material.descripcion }}
                </div>
              </div>
              <button 
                @click.stop="$emit('delete-material', modulo.id, material.id)" 
                class="btn-icon delete-material"
                title="Eliminar"
              >
                ✕
              </button>
            </div>
            
            <div v-if="!modulo.materiales?.length" class="no-materials">
              No hay materiales
            </div>
          </div>

          <!-- Botón subir archivo -->
          <div class="upload-section">
            <input 
              :id="`file-input-${modulo.id}`"
              type="file" 
              accept=".pdf,.zip,.doc,.docx"
              class="file-hidden"
              @change="$emit('file-selected', $event, modulo.id)"
            />
            <button 
              @click="$emit('show-upload-modal', modulo.id)" 
              class="btn-upload"
            >
              📎 Subir archivo (PDF, ZIP, Word)
            </button>
          </div>
        </div>
      </div>

      <!-- Card: Agregar módulo -->
      <div 
        v-if="!showAddModule" 
        class="module-card add-card"
        @click="$emit('update:showAddModule', true)"
      >
        <div class="add-content">
          <span class="add-icon">+</span>
          <span class="add-text">Agregar nuevo módulo</span>
        </div>
      </div>

      <!-- Card: Formulario agregar -->
      <div v-else class="module-card add-form-card">
        <div class="add-form">
          <input 
            :value="newModuleName"
            @input="$emit('update:newModuleName', $event.target.value)"
            type="text" 
            placeholder="Nombre del nuevo módulo *"
            class="add-input"
            @keyup.enter="$emit('create-module')"
            autofocus
          />
          <textarea 
            :value="newModuleDescription"
            @input="$emit('update:newModuleDescription', $event.target.value)"
            placeholder="Descripción del módulo (opcional)"
            class="add-textarea"
            rows="2"
          ></textarea>
          <div class="add-actions">
            <button 
              @click="$emit('create-module')" 
              class="btn-primary btn-sm"
              :disabled="savingModule || !newModuleName?.trim()"
            >
              {{ savingModule ? 'Guardando...' : 'Crear' }}
            </button>
            <button 
              @click="$emit('update:showAddModule', false)" 
              class="btn-secondary btn-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Animación para collapse - usa estilos de global.css */
.module-content {
  overflow: hidden;
  max-height: 2000px;
  opacity: 1;
  transition: all 0.3s ease;
}

.module-content.content-collapsed {
  max-height: 0;
  opacity: 0;
}
</style>
