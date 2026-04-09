<script setup>
import { computed } from 'vue';

const props = defineProps({
  isEditing: { type: Boolean, default: false },
  modulos: { type: Array, required: true },
  parciales: { type: Array, default: () => [] },
  parametros: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  tareaData: { type: Object, default: () => ({}) },
  notaMaximaSugerida: { type: [String, Number, null], default: null }
});

const emit = defineEmits([
  'update:tareaData',
  'update:moduloId',
  'update:parcialId',
  'submit',
  'cancel',
  'fileSelect',
  'parcialChange'
]);

const updateField = (field, value) => {
  emit('update:tareaData', { ...props.tareaData, [field]: value });
};

const onFileSelect = (event) => {
  emit('fileSelect', event.target.files[0]);
};
</script>

<template>
  <div class="tarea-form-container">
    <div class="tarea-form-row">
      <!-- Módulo (solo en crear) -->
      <div v-if="!isEditing" class="form-group">
        <label class="form-label">Módulo *</label>
        <select 
          :value="tareaData.moduloId || tareaData.modulo_id"
          class="tarea-input"
          @change="emit('update:moduloId', $event.target.value)"
        >
          <option value="">Seleccionar...</option>
          <option v-for="modulo in modulos" :key="modulo.id" :value="modulo.id">
            {{ modulo.nombre }}
          </option>
        </select>
      </div>

      <!-- Título -->
      <div class="form-group">
        <label class="form-label">Título *</label>
        <input 
          :value="tareaData.titulo"
          type="text" 
          placeholder="Ej: Tarea de matemáticas"
          class="tarea-input"
          @input="updateField('titulo', $event.target.value)"
        />
      </div>

      <!-- Fecha límite -->
      <div class="form-group">
        <label class="form-label">Fecha límite *</label>
        <input 
          :value="tareaData.fecha_limite"
          type="datetime-local" 
          class="tarea-input"
          @input="updateField('fecha_limite', $event.target.value)"
        />
      </div>

      <!-- Puntaje máximo -->
      <div class="form-group">
        <label class="form-label">Puntaje máximo</label>
        <input 
          :value="tareaData.puntaje_maximo"
          type="number" 
          min="1" 
          max="1000" 
          class="tarea-input"
          style="width: 100px;"
          :placeholder="notaMaximaSugerida ? `Sugerido: ${notaMaximaSugerida}` : ''"
          @input="updateField('puntaje_maximo', $event.target.value)"
        />
      </div>

      <!-- Parcial -->
      <div class="form-group">
        <label class="form-label">Parcial</label>
        <select 
          :value="tareaData.parcial_id"
          class="tarea-input"
          @change="emit('parcialChange', $event.target.value)"
        >
          <option :value="null">Seleccionar parcial...</option>
          <option v-for="parcial in parciales" :key="parcial.id" :value="parcial.id">
            {{ parcial.nombre }}
          </option>
        </select>
      </div>

      <!-- Parámetro -->
      <div class="form-group">
        <label class="form-label">Parámetro</label>
        <select 
          :value="tareaData.parametro_id"
          class="tarea-input"
          :disabled="!tareaData.parcial_id"
          @input="updateField('parametro_id', $event.target.value)"
        >
          <option :value="null">Seleccionar parámetro...</option>
          <option v-for="param in parametros" :key="param.id" :value="param.id">
            {{ param.nombre }} ({{ param.nota_maxima_default }} pts)
          </option>
        </select>
      </div>
    </div>

    <!-- Descripción -->
    <div class="form-group">
      <label class="form-label">Descripción</label>
      <textarea 
        :value="tareaData.descripcion"
        placeholder="Instrucciones de la tarea"
        class="tarea-textarea"
        rows="2"
        @input="updateField('descripcion', $event.target.value)"
      ></textarea>
    </div>

    <!-- Archivo -->
    <div class="form-group">
      <label class="form-label">Archivo adjunto</label>
      <input 
        type="file" 
        accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.ppt,.pptx"
        @change="onFileSelect"
        class="file-input"
      />
      <small class="file-hint">PDF, Word, Excel, PowerPoint, ZIP (max 10MB)</small>
    </div>

    <!-- Botones -->
    <div class="tarea-form-actions">
      <button 
        @click="emit('submit')" 
        class="btn-primary btn-sm" 
        :disabled="saving"
      >
        {{ saving ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Tarea') }}
      </button>
      <button @click="emit('cancel')" class="btn-secondary btn-sm">
        Cancelar
      </button>
    </div>
  </div>
</template>
