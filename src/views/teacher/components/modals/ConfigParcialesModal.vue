<script setup>
import { ref } from 'vue';

const props = defineProps({
  show: Boolean,
  parciales: { type: Array, default: () => [] },
  loading: Boolean
});

const emit = defineEmits(['update:show', 'crearParcial', 'actualizarParcial', 'crearParametro', 'actualizarParametro']);

const newParcialData = ref({ nombre: '', numero: 1, nota_maxima: 100 });
const newParametroData = ref({ nombre: '', tipo: 'tareas', porcentaje: 0, nota_maxima_default: 100 });

const crearParcial = () => {
  if (!newParcialData.value.nombre) return;
  emit('crearParcial', { ...newParcialData.value });
  newParcialData.value = { nombre: '', numero: 1, nota_maxima: 100 };
};

const crearParametro = (parcialId) => {
  if (!newParametroData.value.nombre?.trim()) return;
  emit('crearParametro', parcialId, { ...newParametroData.value });
  newParametroData.value = { nombre: '', tipo: 'tareas', porcentaje: 0, nota_maxima_default: 100 };
};

const close = () => {
  emit('update:show', false);
};
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-content config-modal" @click.stop>
      <div class="modal-header">
        <h3>Configurar Porcentajes y Puntos</h3>
        <button @click="close" class="btn-close">✕</button>
      </div>
      <div class="modal-body">
        <!-- Crear nuevo parcial -->
        <div class="config-section">
          <h4>Crear Parcial</h4>
          <div class="config-form">
            <input v-model="newParcialData.nombre" placeholder="Nombre (ej: Parcial 3)" class="config-input" />
            <input v-model.number="newParcialData.numero" type="number" min="1" placeholder="#" class="config-input-small" />
            <input v-model.number="newParcialData.nota_maxima" type="number" min="1" max="100" placeholder="Pts" class="config-input-small" />
            <button @click="crearParcial" class="btn-primary btn-sm">Crear</button>
          </div>
        </div>
        
        <!-- Lista de parciales -->
        <div class="parciales-list">
          <div v-for="parcial in parciales" :key="parcial.id" class="parcial-item">
            <div class="parcial-header">
              <input 
                :value="parcial.nombre" 
                @change="emit('actualizarParcial', parcial.id, { nombre: $event.target.value, nota_maxima: parcial.nota_maxima })" 
                class="parcial-nombre-input" 
              />
              <span class="nota-maxima-label">Puntos:</span>
              <input 
                v-model.number="parcial.nota_maxima" 
                type="number" 
                min="1" 
                max="100" 
                class="nota-maxima-input" 
                @change="emit('actualizarParcial', parcial.id, { nombre: parcial.nombre, nota_maxima: parcial.nota_maxima })" 
              />
            </div>
            <div v-for="param in parcial.parametros" :key="param.id" class="parametro-item-editable">
              <input 
                v-model="param.nombre" 
                @change="emit('actualizarParametro', param.id, param)" 
                class="param-nombre-input" 
              />
              <input 
                v-model.number="param.porcentaje" 
                type="number" 
                min="0" 
                max="100" 
                class="param-input" 
                @change="emit('actualizarParametro', param.id, param)" 
              />
              <input 
                v-model.number="param.nota_maxima_default" 
                type="number" 
                min="1" 
                class="param-input" 
                @change="emit('actualizarParametro', param.id, param)" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
