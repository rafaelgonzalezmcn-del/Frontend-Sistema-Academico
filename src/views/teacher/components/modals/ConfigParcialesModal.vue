<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  show: Boolean,
  parciales: { type: Array, default: () => [] },
  loading: Boolean
});

const emit = defineEmits(['update:show', 'crearParcial', 'actualizarParcial', 'crearParametro', 'actualizarParametro']);

const newParcialData = ref({ nombre: '', numero: 1, nota_maxima: 100 });
// Formulario "Agregar parámetro" independiente para cada parcial: { [parcialId]: {...} }
// Nota máxima por defecto = la del parcial (10 o 100)
const formVacio = (notaMaxima = 10) => ({ nombre: '', porcentaje: 0, nota_maxima_default: notaMaxima });
const nuevosParametros = ref({});
const formParametro = (parcialId) => nuevosParametros.value[parcialId] ?? formVacio();

// Crear el formulario de cada parcial antes de renderizar (flush 'pre')
watch(
  () => props.parciales,
  (lista) => {
    for (const parcial of lista || []) {
      if (!nuevosParametros.value[parcial.id]) {
        nuevosParametros.value[parcial.id] = formVacio(parcial.nota_maxima || 10);
      }
    }
  },
  { immediate: true }
);

// Suma de porcentajes del parcial (máximo permitido: 100 %)
const totalPorcentaje = (parcial) =>
  (parcial.parametros || []).reduce((suma, p) => suma + (parseFloat(p.porcentaje) || 0), 0);

const crearParcial = () => {
  if (!newParcialData.value.nombre) return;
  emit('crearParcial', { ...newParcialData.value });
  newParcialData.value = { nombre: '', numero: 1, nota_maxima: 100 };
};

// Parámetro personalizado: el backend le asigna tipo "otro" y toma el parcial de la URL
const crearParametro = (parcialId) => {
  const form = formParametro(parcialId);
  if (!form.nombre?.trim()) return;
  emit('crearParametro', parcialId, {
    nombre: form.nombre.trim(),
    porcentaje: form.porcentaje || 0,
    nota_maxima_default: form.nota_maxima_default || 10
  });
  const parcial = props.parciales.find((p) => p.id === parcialId);
  nuevosParametros.value[parcialId] = formVacio(parcial?.nota_maxima || 10);
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

            <!-- Total de porcentajes del parcial -->
            <p class="total-porcentaje" :class="{ 'total-excedido': totalPorcentaje(parcial) > 100 }">
              Total: {{ totalPorcentaje(parcial) }} % de 100 %
            </p>

            <!-- Agregar parámetro personalizado (ej.: Proyecto, Laboratorio) -->
            <div class="agregar-parametro">
              <input
                v-model="nuevosParametros[parcial.id].nombre"
                placeholder="Nuevo parámetro (ej: Proyecto)"
                class="param-nombre-input"
                @keyup.enter="crearParametro(parcial.id)"
              />
              <input
                v-model.number="nuevosParametros[parcial.id].porcentaje"
                type="number"
                min="0"
                max="100"
                title="Porcentaje"
                class="param-input"
              />
              <input
                v-model.number="nuevosParametros[parcial.id].nota_maxima_default"
                type="number"
                min="1"
                title="Nota máxima por defecto de sus tareas"
                class="param-input"
              />
              <button
                class="btn-primary btn-sm"
                :disabled="!nuevosParametros[parcial.id]?.nombre?.trim()"
                @click="crearParametro(parcial.id)"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.total-porcentaje {
  margin: 8px 0 4px;
  font-size: 0.85rem;
  color: #475569;
}

.total-excedido {
  color: #dc2626;
  font-weight: 600;
}

.agregar-parametro {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #cbd5e1;
}
</style>
