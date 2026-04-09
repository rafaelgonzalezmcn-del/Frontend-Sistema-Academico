<template>
  <div class="ver-entregas-tarea">
    <!-- Header -->
    <div class="header-section">
      <button @click="volver" class="btn-volver">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        Volver a la materia
      </button>
      <h2>Entregas de Tarea</h2>
    </div>

    <!-- Info de la tarea -->
    <div v-if="tarea" class="tarea-info">
      <h3>{{ tarea.titulo }}</h3>
      <p v-if="tarea.descripcion" class="text-muted">{{ tarea.descripcion }}</p>
      <p><strong>Fecha límite:</strong> {{ formatDate(tarea.fecha_limite) }}</p>
      
      <!-- Resumen de entregas -->
      <div v-if="resumen" class="resumen-entregas">
        <div class="resumen-item entregado">
          <span class="resumen-numero">{{ resumen.total_entregados }}</span>
          <span class="resumen-label">Entregados</span>
        </div>
        <div class="resumen-item faltante">
          <span class="resumen-numero">{{ resumen.total_faltan }}</span>
          <span class="resumen-label">Faltantes</span>
        </div>
        <div class="resumen-item total">
          <span class="resumen-numero">{{ resumen.total_estudiantes }}</span>
          <span class="resumen-label">Total</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center my-4">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-danger">
      {{ error }}
    </div>

    <!-- Sin estudiantes -->
    <div v-else-if="!estudiantes || estudiantes.length === 0" class="alert alert-info">
      No hay estudiantes inscritos en esta materia.
    </div>

    <!-- Lista de estudiantes con estado de entrega -->
    <div v-else-if="estudiantes && estudiantes.length > 0" class="table-responsive">
      <table class="table table-hover">
        <thead class="table-light">
          <tr>
            <th>#</th>
            <th>Estudiante</th>
            <th>Email</th>
            <th>Estado</th>
            <th>Fecha de entrega</th>
            <th>Archivo</th>
            <th>Nota</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody v-if="estudiantes && estudiantes.length > 0">
          <template v-for="(item, index) in estudiantes" :key="item && item.estudiante ? item.estudiante.id : index">
            <!-- Fila principal del estudiante -->
            <tr :class="{'entregado': item?.ha_entregado, 'no-entregado': !item?.ha_entregado}">
              <td>{{ index + 1 }}</td>
              <td>
                <strong :class="item?.ha_entregado && item?.entrega?.nota ? 'text-success' : ''">
                  {{ item?.estudiante?.first_name }} {{ item?.estudiante?.last_name }}
                </strong>
              </td>
              <td>
                <small class="text-muted">{{ item?.estudiante?.email }}</small>
              </td>
              <td>
                <span v-if="item?.ha_entregado" class="badge" :class="esEntregaTarde(item) ? 'bg-danger' : 'bg-success'">
                  {{ esEntregaTarde(item) ? '⚠️ Tarde' : '✓ Entregado' }}
                </span>
                <span v-else class="badge bg-warning text-dark">✗ Pendiente</span>
              </td>
              <td>
                <div v-if="item?.entrega">
                  <span :class="esEntregaTarde(item) ? 'text-danger' : 'text-success'">
                    {{ formatDate(item?.entrega?.fecha_entrega) }}
                  </span>
                  <div :class="esEntregaTarde(item) ? 'mensaje-tiempo-tarde' : 'mensaje-tiempo-antes'">
                    {{ getMensajeTiempoEntrega(item) }}
                  </div>
                </div>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <span v-if="item?.entrega" class="badge bg-primary">{{ getFileName(item?.entrega?.archivo) }}</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <span v-if="item?.entrega && item?.entrega?.nota !== null" class="badge" :class="getNotaClass(item?.entrega?.nota, puntajeMaximo)">
                  {{ item?.entrega?.nota }}/{{ puntajeMaximo }}
                </span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <div class="acciones-botones">
                  <button 
                    v-if="item?.ha_entregado" 
                    @click="descargarEntrega(item.entrega.id)" 
                    class="btn btn-sm btn-success me-1"
                  >
                    Descargar
                  </button>
                  <button 
                    @click="editandoId === item?.estudiante?.id ? cerrarInlineCalificar() : abrirInlineCalificar(item)" 
                    class="btn btn-sm"
                    :class="editandoId === item?.estudiante?.id ? 'btn-danger' : 'btn-primary'"
                  >
                    {{ editandoId === item?.estudiante?.id ? 'Cancelar' : (item?.entrega && item?.entrega?.nota !== null ? 'Editar' : 'Calificar') }}
                  </button>
                </div>
              </td>
            </tr>
            
            <!-- Fila inline para calificar - ahora dentro del v-for, item accesible -->
            <tr v-if="editandoId === item?.estudiante?.id" class="fila-calificacion">
              <td colspan="8">
                <div class="calificacion-inline">
                  <div class="calificacion-campos">
                    <div class="mb-2">
                      <label class="form-label me-2">Nota (0-{{ puntajeMaximo }}):</label>
                      <input 
                        v-model.number="notaCalificacion" 
                        type="number" 
                        class="form-control form-control-sm d-inline-block" 
                        style="width: 80px;"
                        min="0" 
                        :max="puntajeMaximo"
                      >
                    </div>
                    <div class="mb-2">
                      <label class="form-label me-2">Observaciones:</label>
                      <input 
                        v-model="observacionesCalificacion" 
                        type="text" 
                        class="form-control form-control-sm d-inline-block" 
                        style="width: 250px;"
                        placeholder="Comentarios..."
                      >
                    </div>
                  </div>
                  <div class="calificacion-acciones">
                    <button 
                      @click="guardarCalificacion" 
                      class="btn btn-sm btn-success"
                      :disabled="guardandoCalificacion"
                    >
                      {{ guardandoCalificacion ? 'Guardando...' : 'Guardar' }}
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Resumen -->
    <div v-if="estudiantes.length > 0" class="summary mt-3">
      <p class="text-muted">
        <strong>Total de entregas:</strong> {{ resumen?.total_entregados || 0 }} / {{ resumen?.total_estudiantes || 0 }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EntregaService from '@/services/EntregaService';

const route = useRoute();
const router = useRouter();

const tarea = ref(null);
const estudiantes = ref([]);
const resumen = ref(null);
const isLoading = ref(true);
const error = ref('');

// Calificación inline
const editandoId = ref(null);
const entregaSeleccionada = ref(null);
const notaCalificacion = ref(0);
const observacionesCalificacion = ref('');
const guardandoCalificacion = ref(false);

const materiaId = () => route.params.materiaId;
const tareaId = () => route.params.tareaId;

// Computed para el puntaje máximo de la tarea
const puntajeMaximo = computed(() => {
  return tarea.value?.puntaje_maximo || 100;
});

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getFileName = (path) => {
  if (!path) return 'Sin archivo';
  return path.split('/').pop();
};

// Verificar si la entrega fue después de la fecha límite
const esEntregaTarde = (item) => {
  if (!item?.entrega?.fecha_entrega || !tarea.value?.fecha_limite) return false;
  const fechaEntrega = new Date(item.entrega.fecha_entrega);
  const fechaLimite = new Date(tarea.value.fecha_limite);
  return fechaEntrega > fechaLimite;
};

// Obtener mensaje de tiempo antes/después
const getMensajeTiempoEntrega = (item) => {
  if (!item?.entrega?.fecha_entrega || !tarea.value?.fecha_limite) return '';
  
  const fechaEntrega = new Date(item.entrega.fecha_entrega);
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
      mensaje = `${diffDays}d ${remainingHours}h tarde`;
    } else if (diffHours > 0) {
      mensaje = `${diffHours}h ${remainingMinutes}m tarde`;
    } else {
      mensaje = `${diffMinutes}m tarde`;
    }
  } else {
    // Antes
    if (diffDays > 0) {
      mensaje = `${diffDays}d ${remainingHours}h antes`;
    } else if (diffHours > 0) {
      mensaje = `${diffHours}h ${remainingMinutes}m antes`;
    } else {
      mensaje = `${diffMinutes}m antes`;
    }
  }
  
  return mensaje;
};

const getNotaClass = (nota, max = 100) => {
  const percentage = (nota / max) * 100;
  if (percentage >= 70) return 'bg-success';
  if (percentage >= 50) return 'bg-warning text-dark';
  return 'bg-danger';
};

const volver = () => {
  router.push(`/profesor/materia/${materiaId()}`);
};

const cargarTarea = async () => {
  try {
    // Los datos de la tarea vienen en la respuesta de entregas
  } catch (err) {
    console.error('Error al cargar tarea:', err);
  }
};

const cargarEntregas = async () => {
  isLoading.value = true;
  error.value = '';
  
  try {
    // El servicio ahora devuelve respuesta normalizada
    const response = await EntregaService.obtenerEntregasTarea(tareaId());
    
    if (response.data) {
      // La respuesta normalizada tiene los datos en response.data
      // Los campos especiales (tarea, resumen) vienen en response.raw.data
      tarea.value = response.raw?.data?.tarea || response.data.tarea;
      estudiantes.value = response.data || [];
      resumen.value = response.raw?.data?.resumen || response.data?.resumen;
    }
  } catch (err) {
    console.error('Error al obtener entregas:', err);
    if (err.response?.data?.message) {
      error.value = err.response.data.message;
    } else {
      error.value = 'Error al cargar las entregas';
    }
  } finally {
    isLoading.value = false;
  }
};

const descargarEntrega = async (entregaId) => {
  try {
    const response = await EntregaService.descargarEntrega(entregaId);
    if (response.data && response.data.download_url) {
      window.open(response.data.download_url, '_blank');
    }
  } catch (err) {
    console.error('Error al descargar:', err);
    alert('Error al descargar el archivo');
  }
};

const abrirInlineCalificar = (item) => {
  editandoId.value = item.estudiante.id;
  entregaSeleccionada.value = item;
  notaCalificacion.value = item.entrega?.nota || 0;
  observacionesCalificacion.value = item.entrega?.observaciones || '';
};

const cerrarInlineCalificar = () => {
  editandoId.value = null;
  entregaSeleccionada.value = null;
  notaCalificacion.value = 0;
  observacionesCalificacion.value = '';
};

const guardarCalificacion = async () => {
  if (!entregaSeleccionada.value) return;
  
  guardandoCalificacion.value = true;
  
  try {
    const item = entregaSeleccionada.value;
    let response;
    
    // Si ya tiene entrega, usar su ID; si no, pasar tarea_id y estudiante_id
    if (item.entrega && item.entrega.id) {
      response = await EntregaService.calificarEntrega(item.entrega.id, {
        nota: notaCalificacion.value,
        observaciones: observacionesCalificacion.value
      });
    } else {
      // Crear entrega con nota para estudiante que no entregó
      response = await EntregaService.calificarEntrega('crear', {
        nota: notaCalificacion.value,
        observaciones: observacionesCalificacion.value,
        tarea_id: parseInt(route.params.tareaId),
        estudiante_id: item.estudiante.id
      });
    }
    
    // Verificar si la respuesta fue exitosa (status 2xx)
    if (response.status >= 200 && response.status < 300) {
      // Recargar los datos
      await cargarEntregas();
      cerrarInlineCalificar();
      alert('Calificación guardada correctamente');
    } else {
      // Mostrar mensaje de error del backend
      alert(response.message || 'Error al guardar la calificación');
    }
  } catch (err) {
    console.error('Error al calificar:', err);
    // Mostrar mensaje de error del backend si existe
    const errorMessage = err.response?.data?.message || 'Error al guardar la calificación';
    alert(errorMessage);
  } finally {
    guardandoCalificacion.value = false;
  }
};

onMounted(() => {
  cargarTarea();
  cargarEntregas();
});
</script>

<style scoped>
.ver-entregas-tarea {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.header-section h2 {
  margin: 0;
  color: #2c3e50;
}

.btn-volver {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.btn-volver:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-volver:active {
  transform: translateY(0);
}

.tarea-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.tarea-info h3 {
  margin: 0 0 10px 0;
  color: #495057;
}

.resumen-entregas {
  display: flex;
  gap: 20px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #dee2e6;
}

.resumen-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 20px;
  border-radius: 8px;
  min-width: 100px;
}

.resumen-item.entregado {
  background: #d1e7dd;
}

.resumen-item.faltante {
  background: #fff3cd;
}

.resumen-item.total {
  background: #e2e3e5;
}

.resumen-numer {
  font-size: 1.5rem;
  font-weight: bold;
}

.resumen-numero {
  font-size: 1.5rem;
  font-weight: bold;
}

.summary {
  padding: 10px;
  background: #e9ecef;
  border-radius: 4px;
}

.table {
  margin-top: 10px;
}

.badge {
  font-size: 0.85em;
}

tr.entregado {
  background: rgba(25, 135, 84, 0.05);
}

.fila-calificacion td {
  background: rgba(13, 110, 253, 0.05);
  padding: 15px;
  border-top: 2px solid rgba(13, 110, 253, 0.2);
}

.calificacion-inline {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.calificacion-campos {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.calificacion-acciones {
  display: flex;
  gap: 10px;
}

.form-label {
  margin-bottom: 0;
  font-weight: 500;
}

tr.no-entregado {
  background: rgba(255, 193, 7, 0.1);
}

.acciones-botones {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.acciones-botones .btn {
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.mensaje-tiempo-tarde {
  font-size: 11px;
  color: #dc3545;
  margin-top: 4px;
  font-weight: 500;
}

.mensaje-tiempo-antes {
  font-size: 11px;
  color: #198754;
  margin-top: 4px;
  font-weight: 500;
}
</style>
