<script setup>
import { getParamIcon, formatFecha, formatFileSize, getEstadoColor } from '@/utils/formatters';

const props = defineProps({
  param: { type: Object, required: true },
  parcialKey: { type: String, required: true },
  expanded: { type: Boolean, default: false },
  estudianteId: { type: [Number, String], required: true },
  tareas: { type: Array, default: () => [] },
  notaParam: { type: Object, default: null },
  getTotalParametro: { type: Function, required: true },
  getCalificacionPonderada: { type: Function, required: true },
  calcularPonderacion: { type: Function, required: true },
  getCalificacionTarea: { type: Function, required: true }
});

const emit = defineEmits(['toggle']);

const toggle = () => {
  emit('toggle', props.estudianteId, props.parcialKey.split('-')[1], props.param.id);
};
</script>

<template>
  <div class="notas-param-card">
    <div class="notas-param-header" @click="toggle">
      <span class="expand-icon tiny" :class="{ rotated: expanded }">▶</span>
      <span class="param-icon">{{ getParamIcon(param.tipo) }}</span>
      <span class="param-nombre">{{ param.nombre }}</span>
      <span class="param-nota">{{ getTotalParametro(param.id) }}</span>
      <span class="param-porcentaje">{{ param.porcentaje }}%</span>
    </div>

    <div v-if="expanded" class="notas-param-body">
      <table class="grade-items-table">
        <thead>
          <tr>
            <th>Ítem</th>
            <th>Ponderación</th>
            <th>Calificación</th>
            <th>Rango</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tarea in tareas" :key="tarea.id">
            <td>{{ tarea.titulo }}</td>
            <td>{{ calcularPonderacion(tarea, param) }}</td>
            <td>{{ getCalificacionTarea(tarea) }}</td>
            <td>0 - {{ param.nota_maxima_default }}</td>
            <td>100%</td>
          </tr>
          <tr class="total-row">
            <td><strong>Cálculo total</strong></td>
            <td>-</td>
            <td><strong>{{ getTotalParametro(param.id) }}</strong></td>
            <td>0 - {{ param.nota_maxima_default }}</td>
            <td>100%</td>
          </tr>
        </tbody>
      </table>
      <div class="calificacion-calculada">
        <span>Calificación calculada {{ param.nombre }}:</span>
        <strong>{{ getCalificacionPonderada(param) }}</strong>
        <span>({{ param.porcentaje }}%)</span>
      </div>
    </div>
  </div>
</template>
