<script setup>
import { getParamIcon } from '@/utils/formatters';
import ParametroRow from './ParametroRow.vue';

const props = defineProps({
  nota: { type: Object, required: true },
  estudianteId: { type: [Number, String], required: true },
  parcialKey: { type: String, required: true },
  parcialExpanded: { type: Boolean, default: false },
  parametrosExpandidos: { type: Object, required: true },
  tareasCargadas: { type: Object, required: true },
  sumaPorcentajes: { type: Function, required: true },
  getTareasParametro: { type: Function, required: true },
  getNotaParametroForEstudiante: { type: Function, required: true },
  getTotalParametro: { type: Function, required: true },
  obtenerTotalParcial: { type: Function, required: true },
  getCalificacionPonderada: { type: Function, required: true },
  calcularPonderacion: { type: Function, required: true },
  getCalificacionTarea: { type: Function, required: true }
});

const emit = defineEmits(['toggleParcial', 'toggleParametro']);

const toggleParcial = () => {
  emit('toggleParcial', props.estudianteId, props.nota.parciales[0]?.id);
};

const toggleParametro = (estudianteId, parcialId, paramId) => {
  emit('toggleParametro', estudianteId, parcialId, paramId);
};

const getKey = (paramId) => {
  return `${props.estudianteId}-${props.nota.parciales[0]?.id}-${paramId}`;
};
</script>

<template>
  <div class="notas-parcial-card">
    <div 
      v-for="parcial in nota.parciales" 
      :key="parcial.id" 
      class="notas-parcial-card"
    >
      <div class="notas-parcial-header" @click="toggleParcial">
        <span class="expand-icon small" :class="{ rotated: parcialExpanded }">▶</span>
        <span class="parcial-nombre">{{ parcial.nombre }}</span>
        <span class="parcial-nota">{{ parcial.nota_final?.toFixed(2) || '0.00' }}</span>
        <span class="parcial-porcentaje">{{ sumaPorcentajes(parcial) }}%</span>
      </div>

      <div v-if="parcialExpanded" class="notas-parcial-body">
        <ParametroRow
          v-for="param in parcial.parametros"
          :key="param.id"
          :param="param"
          :parcial-key="`${estudianteId}-${parcial.id}`"
          :expanded="parametrosExpandidos[getKey(param.id)]"
          :estudiante-id="estudianteId"
          :tareas="getTareasParametro(param.id)"
          :nota-param="getNotaParametroForEstudiante(param.id)"
          :get-total-parametro="getTotalParametro"
          :get-calificacion-ponderada="getCalificacionPonderada"
          :calcular-ponderacion="calcularPonderacion"
          :get-calificacion-tarea="getCalificacionTarea"
          @toggle="toggleParametro"
        />
      </div>
    </div>
  </div>
</template>
