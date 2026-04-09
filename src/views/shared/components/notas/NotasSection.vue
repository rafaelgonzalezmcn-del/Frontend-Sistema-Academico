<script setup>
import { ref, watch, computed } from 'vue';
import { useNotas } from '@/composables/notas/useNotas';
import { useMisNotas } from '@/composables/notas/useMisNotas';
import { useParciales } from '@/composables/useParciales';
import api from '@/services/api';
import ConfigParcialesModal from '@/views/teacher/components/modals/ConfigParcialesModal.vue';
import { getParamIcon } from '@/utils/formatters';

const props = defineProps({
  modulos: { type: Array, required: true },
  // ID de la materia (necesario para estudiante)
  materiaId: {
    type: [Number, String],
    default: null
  },
  // Modo: 'profesor' | 'estudiante'
  mode: {
    type: String,
    default: 'profesor',
    validator: (v) => ['profesor', 'estudiante'].includes(v)
  },
  // ID del estudiante logueado (para modo estudiante)
  estudianteId: {
    type: Number,
    default: null
  }
});

const emit = defineEmits(['verEntregas']);

// Computeds para determinar el modo
const isProfesor = computed(() => props.mode === 'profesor');
const isEstudiante = computed(() => props.mode === 'estudiante');

// === MODO PROFESOR: useNotas ===
const {
  notasData,
  notasParciales,
  loadingNotas: loadingNotasProfesor,
  estudianteSeleccionadoId,
  notasEstudiantesExpandidos,
  notasParcialesExpandidos,
  notasParametrosExpandidos,
  toggleEstudianteNota,
  toggleParcialNota,
  toggleParametroNota,
  getTareasParametro,
  obtenerTotalParametro,
  obtenerNotaParcial,
  obtenerCalificacionPonderada,
  calcularPonderacion,
  obtenerCalificacionTarea,
  calcularPromedioGeneral,
  cargarNotas: cargarNotasProfesor
} = useNotas();

const {
  parciales,
  parametros,
  loadingParciales,
  crearParcial,
  actualizarParcial,
  crearParametro,
  actualizarParametro,
  sumaPorcentajes,
  cargarParciales
} = useParciales();

// === MODO ESTUDIANTE: useMisNotas ===
const {
  misNotas,
  notaFinal,
  loadingNotas: loadingNotasEstudiante,
  parcialesData,
  cargarMisNotas,
  cargarTareasParametro,
  getTareasParametro: getTareasParametroEstudiante,
  getNotaTarea,
  getNotaFinal: getNotaFinalEstudiante,
  obtenerNotaParcial: obtenerNotaParcialEstudiante,
  getTipoNombre
} = useMisNotas();

// Estados de expansión para estudiante
const estudianteParcialesExpandidos = ref({});
const estudianteParametrosExpandidos = ref({});

// Toggle parcial estudiante
const toggleParcialEstudiante = async (parcialId) => {
  estudianteParcialesExpandidos.value[parcialId] = !estudianteParcialesExpandidos.value[parcialId];
  if (estudianteParcialesExpandidos.value[parcialId]) {
    // Buscar en misNotas -> parciales array
    for (const nota of misNotas.value) {
      const parcial = nota.parciales?.find(p => p.parcial?.id === parcialId);
      if (parcial) {
        console.log('Cargando parcial:', parcialId, 'parcial:', JSON.parse(JSON.stringify(parcial)));
        console.log('Parámetros:', JSON.parse(JSON.stringify(parcial.parametros)));
        break;
      }
    }
  }
};

// Toggle parámetro estudiante
const toggleParametroEstudiante = (parcialId, parametroId) => {
  const key = `${parcialId}-${parametroId}`;
  estudianteParametrosExpandidos.value[key] = !estudianteParametrosExpandidos.value[key];
};



// Loading unificado
const loadingNotas = computed(() => {
  return isProfesor.value ? loadingNotasProfesor.value : loadingNotasEstudiante.value;
});

// Primer módulo para cargar notas (profesor)
const primerModuloId = computed(() => props.modulos.length > 0 ? props.modulos[0].id : null);

// Watch para cargar notas según el modo
watch(primerModuloId, async (id) => {
  if (isProfesor.value && id) {
    await Promise.all([cargarNotasProfesor(id), cargarParciales(id)]);
  }
}, { immediate: true });

// Watch para cargar notas del estudiante
watch([primerModuloId, () => props.estudianteId], async ([moduloId, estudianteId]) => {
  if (isEstudiante.value && moduloId && estudianteId) {
    await cargarMisNotas(moduloId, estudianteId);
  }
}, { immediate: true });

// Funciones del profesor
const onEstudianteSeleccionadoChange = () => {};

const handleCrearParcial = async (data) => {
  await crearParcial({ ...data, modulo_id: primerModuloId.value });
  await cargarNotasProfesor(primerModuloId.value);
};

const handleActualizarParcial = async (id, data) => {
  await actualizarParcial(id, data);
  await cargarNotasProfesor(primerModuloId.value);
};

const handleCrearParametro = async (parcialId, data) => {
  await crearParametro(parcialId, data);
  await cargarNotasProfesor(primerModuloId.value);
};

const handleActualizarParametro = async (id, data) => {
  await actualizarParametro(id, data);
  await cargarNotasProfesor(primerModuloId.value);
};

const showConfigParcial = ref(false);
</script>

<template>
  <section class="notas-section">
    <!-- Header -->
    <div class="notas-header">
      <h2 class="section-title">{{ isEstudiante ? 'Mis Notas' : 'Notas' }}</h2>
      <!-- Botón config: SOLO profesor -->
      <button v-if="isProfesor" @click="showConfigParcial = true" class="btn-config">
        ⚙️ Configurar Parciales
      </button>
    </div>

    <!-- Selector estudiante: SOLO profesor -->
    <div v-if="isProfesor" class="notas-selector">
      <label>Seleccionar estudiante:</label>
      <select v-model="estudianteSeleccionadoId" @change="onEstudianteSeleccionadoChange">
        <option :value="null">Ver todos ({{ calcularPromedioGeneral() }})</option>
        <option v-for="n in notasData" :key="n.estudiante.id" :value="n.estudiante.id">
          {{ n.estudiante.nombre }}
        </option>
      </select>
    </div>

    <div v-if="loadingNotas" class="loading">Cargando notas...</div>

    <!-- MODO ESTUDIANTE: Vista completa como el profesor pero solo lectura -->
    <div v-else-if="isEstudiante" class="notas-estudiante-view">
      <!-- Nota final -->
      <div class="nota-final-card" v-if="misNotas?.length > 0">
        <span class="nota-final-label">Nota Final</span>
        <span class="nota-final-value">{{ getNotaFinalEstudiante() }}</span>
      </div>

      <!-- Lista vacía -->
      <div v-else-if="!loadingNotas" class="empty-state">
        <span class="empty-icon">📊</span>
        <h3>No hay notas disponibles</h3>
        <p>Completa tus tareas para ver tus calificaciones</p>
      </div>

      <!-- Parciales del estudiante - Nueva estructura -->
      <div v-if="misNotas?.length > 0" class="notas-estudiante-view">
        <!-- La estructura ahora es: misNotas[0].parciales[] -->
        <div v-for="nota in misNotas" :key="nota.estudiante?.id" class="notas-estudiante-card">
          <!-- Iterar sobre parciales -->
          <div v-for="parcial in nota.parciales" :key="parcial.parcial?.id" class="notas-parcial-card">
            <!-- Cabecera del parcial (expandible) -->
            <div class="notas-parcial-header" @click="toggleParcialEstudiante(parcial.parcial?.id)">
              <span class="expand-icon small" :class="{ rotated: estudianteParcialesExpandidos[parcial.parcial?.id] }">▶</span>
              <span class="parcial-nombre">{{ parcial.parcial?.nombre }}</span>
              <span class="parcial-nota">{{ parcial.nota_final?.toFixed(2) || '0.00' }}</span>
              <span class="parcial-porcentaje">100%</span>
            </div>

            <!-- Parámetros del parcial (expandibles) -->
            <div v-if="estudianteParcialesExpandidos[parcial.parcial?.id]" class="notas-parcial-body">
              <div v-for="param in parcial.parametros" :key="param.id" class="notas-param-card">
                <div class="notas-param-header" @click="toggleParametroEstudiante(parcial.parcial?.id, param.id)">
                  <span class="expand-icon tiny" :class="{ rotated: estudianteParametrosExpandidos[parcial.parcial?.id + '-' + param.id] }">▶</span>
                  <span class="param-icon">{{ getParamIcon(param.tipo) }}</span>
                  <span class="param-nombre">{{ param.nombre }}</span>
                  <span class="param-nota">{{ param.nota_parametro ?? '-' }}</span>
                  <span class="param-porcentaje">{{ param.porcentaje }}%</span>
                </div>

                <!-- Tabla de tareas del parámetro -->
                <div v-if="estudianteParametrosExpandidos[parcial.parcial?.id + '-' + param.id]" class="notas-param-body">
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
                      <tr v-for="tarea in param.tareas" :key="tarea.id">
                        <td>{{ tarea.titulo }}</td>
                        <td>-</td>
                        <td>{{ tarea.nota ?? '-' }}</td>
                        <td>0 - {{ param.nota_maxima_default || 10 }}</td>
                        <td>100%</td>
                      </tr>
                      <tr class="total-row">
                        <td><strong>Cálculo total</strong></td>
                        <td>-</td>
                        <td><strong>{{ param.nota_parametro ?? '-' }}</strong></td>
                        <td>0 - {{ param.nota_maxima_default || 10 }}</td>
                        <td>100%</td>
                      </tr>
                    </tbody>
                  </table>
                  <div class="calificacion-calculada">
                    <span>Calificación calculada {{ param.nombre }}:</span>
                    <strong>{{ Number(param.nota_ponderada || 0).toFixed(2) }}</strong>
                    <span>({{ param.porcentaje }}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODO PROFESOR: Vista completa con acordeón -->
    <div v-else class="notas-accordion">
      <div v-for="nota in notasData" :key="nota.estudiante.id" class="notas-estudiante-card">
        <div class="notas-estudiante-header" @click="toggleEstudianteNota(nota.estudiante.id)">
          <span class="expand-icon" :class="{ rotated: notasEstudiantesExpandidos[nota.estudiante.id] }">▶</span>
          <span class="estudiante-nombre">{{ nota.estudiante.nombre }}</span>
          <span class="estudiante-email">{{ nota.estudiante.email }}</span>
          <span class="nota-value">Nota: {{ nota.nota_final?.toFixed(2) || '0.00' }}</span>
        </div>

        <div v-if="notasEstudiantesExpandidos[nota.estudiante.id]" class="notas-estudiante-body">
          <div v-for="parcial in nota.parciales" :key="parcial.id" class="notas-parcial-card">
            <div class="notas-parcial-header" @click="toggleParcialNota(nota.estudiante.id, parcial.id)">
              <span class="expand-icon small" :class="{ rotated: notasParcialesExpandidos[nota.estudiante.id + '-' + parcial.id] }">▶</span>
              <span class="parcial-nombre">{{ parcial.nombre }}</span>
              <span class="parcial-nota">{{ obtenerNotaParcial(nota, parcial.id) }}</span>
              <span class="parcial-porcentaje">{{ sumaPorcentajes(parcial) }}%</span>
            </div>

            <div v-if="notasParcialesExpandidos[nota.estudiante.id + '-' + parcial.id]" class="notas-parcial-body">
              <div v-for="param in parcial.parametros" :key="param.id" class="notas-param-card">
                <div class="notas-param-header" @click="toggleParametroNota(nota.estudiante.id, parcial.id, param.id)">
                  <span class="expand-icon tiny" :class="{ rotated: notasParametrosExpandidos[nota.estudiante.id + '-' + parcial.id + '-' + param.id] }">▶</span>
                  <span class="param-icon">{{ getParamIcon(param.tipo) }}</span>
                  <span class="param-nombre">{{ param.nombre }}</span>
                  <span class="param-nota">{{ obtenerTotalParametro(param.id) }}</span>
                  <span class="param-porcentaje">{{ param.porcentaje }}%</span>
                </div>

                <div v-if="notasParametrosExpandidos[nota.estudiante.id + '-' + parcial.id + '-' + param.id]" class="notas-param-body">
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
                      <tr v-for="tarea in getTareasParametro(param.id)" :key="tarea.id">
                        <td>{{ tarea.titulo }}</td>
                        <td>{{ calcularPonderacion(tarea, param) }}</td>
                        <td>{{ obtenerCalificacionTarea(tarea) }}</td>
                        <td>0 - {{ param.nota_maxima_default }}</td>
                        <td>100%</td>
                      </tr>
                      <tr class="total-row">
                        <td><strong>Cálculo total</strong></td>
                        <td>-</td>
                        <td><strong>{{ obtenerTotalParametro(param.id) }}</strong></td>
                        <td>0 - {{ param.nota_maxima_default }}</td>
                        <td>100%</td>
                      </tr>
                    </tbody>
                  </table>
                  <div class="calificacion-calculada">
                    <span>Calificación calculada {{ param.nombre }}:</span>
                    <strong>{{ obtenerCalificacionPonderada(param) }}</strong>
                    <span>({{ param.porcentaje }}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal config: SOLO profesor -->
    <ConfigParcialesModal
      v-if="isProfesor"
      v-model:show="showConfigParcial"
      :parciales="notasParciales"
      :loading="loadingParciales"
      @crear-parcial="handleCrearParcial"
      @actualizar-parcial="handleActualizarParcial"
      @crear-parametro="handleCrearParametro"
      @actualizar-parametro="handleActualizarParametro"
    />
  </section>
</template>

<style scoped>
/* Nota final para estudiante */
.nota-final-card {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  margin-bottom: 24px;
}

.nota-final-label {
  display: block;
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.nota-final-value {
  font-size: 48px;
  font-weight: 700;
}

.notas-estudiante-view {
  padding: 0;
}

/* Estilos del profesor que también se usan en estudiante */
.notas-parcial-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0;
  margin-bottom: 16px;
  overflow: hidden;
}

.notas-parcial-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: #f8fafc;
  cursor: pointer;
  border-bottom: 1px solid #e2e8f0;
}

.notas-parcial-header:hover {
  background: #f1f5f9;
}

.parcial-nota {
  margin-left: auto;
  font-size: 20px;
  font-weight: 700;
  color: #3b82f6;
}

.parcial-porcentaje {
  margin-left: 16px;
  color: #64748b;
}

.notas-parcial-body {
  padding: 16px 20px;
}

.notas-param-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
}

.notas-param-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  cursor: pointer;
}

.notas-param-header:hover {
  background: #f5f5f5;
}

.param-nota {
  margin-left: auto;
  font-weight: 600;
  color: #334155;
}

.param-porcentaje {
  margin-left: 12px;
  color: #64748b;
}

.notas-param-body {
  padding: 16px;
  background: white;
  border-top: 1px solid #e2e8f0;
}

.grade-items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}

.grade-items-table th,
.grade-items-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.grade-items-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
  font-size: 13px;
}

.grade-items-table td {
  color: #334155;
  font-size: 14px;
}

.grade-items-table .total-row {
  background: #f0fdf4;
}

.grade-items-table .total-row td {
  font-weight: 600;
  color: #166534;
}

.calificacion-calculada {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #eff6ff;
  border-radius: 8px;
  color: #1e40af;
  font-size: 14px;
}

.calificacion-calculada strong {
  font-size: 18px;
}

/* Iconos de expansión */
.expand-icon {
  display: inline-block;
  margin-right: 8px;
  font-size: 10px;
  transition: transform 0.2s;
}

.expand-icon.rotated {
  transform: rotate(90deg);
}

.expand-icon.small {
  font-size: 12px;
}

.expand-icon.tiny {
  font-size: 10px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #f8fafc;
  border-radius: 12px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px;
  color: #475569;
}

.empty-state p {
  color: #94a3b8;
}
</style>
