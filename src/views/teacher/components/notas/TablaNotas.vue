<script setup>
import ResumenNotas from './ResumenNotas.vue';

const props = defineProps({
  notasData: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  estudianteSeleccionadoId: { type: [Number, String, null], default: null },
  estudiantesExpandidos: { type: Object, required: true },
  parcialesExpandidos: { type: Object, required: true },
  parametrosExpandidos: { type: Object, required: true },
  tareasCargadas: { type: Object, required: true },
  sumaPorcentajes: { type: Function, required: true },
  getTareasParametro: { type: Function, required: true },
  getNotaParametroForEstudiante: { type: Function, required: true },
  getTotalParametro: { type: Function, required: true },
  getCalificacionPonderada: { type: Function, required: true },
  calcularPonderacion: { type: Function, required: true },
  getCalificacionTarea: { type: Function, required: true },
  toggleEstudiante: { type: Function, required: true },
  toggleParcial: { type: Function, required: true },
  toggleParametro: { type: Function, required: true }
});

const emit = defineEmits(['update:estudianteSeleccionado']);

const onEstudianteChange = (event) => {
  emit('update:estudianteSeleccionado', event.target.value ? Number(event.target.value) : null);
};
</script>

<template>
  <div class="notas-tabla">
    <!-- Selector de estudiante -->
    <div class="notas-selector">
      <label>Seleccionar estudiante:</label>
      <select 
        :value="estudianteSeleccionadoId" 
        @change="onEstudianteChange"
      >
        <option :value="null">Ver todos</option>
        <option 
          v-for="nota in notasData" 
          :key="nota.estudiante.id" 
          :value="nota.estudiante.id"
        >
          {{ nota.estudiante.nombre }}
        </option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">Cargando notas...</div>

    <!-- Lista de estudiantes -->
    <div v-else class="notas-accordion">
      <div 
        v-for="nota in notasData" 
        :key="nota.estudiante.id" 
        class="notas-estudiante-card"
      >
        <div 
          class="notas-estudiante-header" 
          @click="toggleEstudiante(nota.estudiante.id)"
        >
          <span 
            class="expand-icon" 
            :class="{ rotated: estudiantesExpandidos[nota.estudiante.id] }"
          >▶</span>
          <span class="estudiante-nombre">{{ nota.estudiante.nombre }}</span>
          <span class="estudiante-email">{{ nota.estudiante.email }}</span>
          <span class="nota-value">
            Nota: {{ nota.nota_final?.toFixed(2) || '0.00' }}
          </span>
        </div>

        <div 
          v-if="estudiantesExpandidos[nota.estudiante.id]" 
          class="notas-estudiante-body"
        >
          <ResumenNotas
            :nota="nota"
            :estudiante-id="nota.estudiante.id"
            :parcial-key="nota.parciales[0]?.id ? `${nota.estudiante.id}-${nota.parciales[0].id}` : ''"
            :parcial-expanded="nota.parciales[0] ? parcialesExpandidos[`${nota.estudiante.id}-${nota.parciales[0].id}`] : false"
            :parametros-expandidos="parametrosExpandidos"
            :tareas-cargadas="tareasCargadas"
            :suma-porcentajes="sumaPorcentajes"
            :get-tareas-parametro="getTareasParametro"
            :get-nota-parametro-for-estudiante="getNotaParametroForEstudiante"
            :get-total-parametro="getTotalParametro"
            :get-calificacion-ponderada="getCalificacionPonderada"
            :calcular-ponderacion="calcularPonderacion"
            :get-calificacion-tarea="getCalificacionTarea"
            @toggle-parcial="toggleParcial"
            @toggle-parametro="toggleParametro"
          />
        </div>
      </div>
    </div>
  </div>
</template>
