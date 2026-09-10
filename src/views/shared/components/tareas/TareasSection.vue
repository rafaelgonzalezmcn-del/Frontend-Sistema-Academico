<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useTareas } from '@/composables/tareas/useTareas';
import { useParciales } from '@/composables/useParciales';
import api from '@/services/api';
import { formatFecha, formatFileSize, getEstadoColor } from '@/utils/formatters';
import SubirEntrega from '@/components/entregas/SubirEntrega.vue';

const props = defineProps({
  modulos: { type: Array, required: true },
  materiaId: { required: true },
  // Modo: 'profesor' | 'estudiante'
  mode: {
    type: String,
    default: 'profesor',
    validator: (v) => ['profesor', 'estudiante'].includes(v)
  },
  tareaIdSeleccionada: { type: Number, default: null }
});

const emit = defineEmits(['verEntregas']);

// Computeds para determinar el modo
const isProfesor = computed(() => props.mode === 'profesor');
const isEstudiante = computed(() => props.mode === 'estudiante');

const router = useRouter();

const modulosRef = computed(() => props.modulos);

const {
  tareas,
  loadingTareas,
  showAddTarea,
  editingTareaId,
  editingTareaData,
  newTareaModuloId,
  newTareaTitulo,
  newTareaDescripcion,
  newTareaFechaLimite,
  newTareaPuntajeMaximo,
  newTareaArchivo,
  newTareaParcialId,
  newTareaParametroId,
  parametrosEdicion,
  savingTarea,
  createTarea,
  updateTarea,
  deleteTarea,
  startEditTarea,
  cancelEditTarea,
  resetNewTareaForm,
  handleTareaFileSelect,
  handleEditTareaFileSelect,
  notaMaximaSugerida,
  fetchAllTareas
} = useTareas(modulosRef);

const { parciales, parametros, loadingParciales, cargarParciales, cargarParametros } = useParciales();

const modulosColapsados = ref({});

// Abrir automáticamente la tarea seleccionada
const openSelectedTarea = async () => {
  if (!props.tareaIdSeleccionada || !modulosRef.value?.length) return;
  
  // Buscar el módulo de la tarea
  for (const modulo of modulosRef.value) {
    if (!modulo.tareas) continue;
    const tarea = modulo.tareas.find(t => t.id === props.tareaIdSeleccionada);
    if (tarea) {
      // Expandir el módulo si está colapsado
      if (modulosColapsados.value[modulo.id] === false) {
        modulosColapsados.value[modulo.id] = true;
      }
      // Abrir para edición solo si es profesor
      if (isProfesor.value) {
        startEditTarea(tarea);
      }
      break;
    }
  }
};

onMounted(async () => {
  await fetchAllTareas();
});

// Observar cambios en la tarea seleccionada
watch(() => props.tareaIdSeleccionada, (newTareaId) => {
  if (newTareaId) {
    openSelectedTarea();
  }
});

const handleParcialChange = async () => {
  newTareaParametroId.value = null;
  parametros.value = [];
  newTareaPuntajeMaximo.value = 100;
  if (newTareaParcialId.value) {
    await cargarParametros(newTareaParcialId.value);
  }
};

const handleEditParcialChange = async () => {
  editingTareaData.value.parametro_id = null;
  parametrosEdicion.value = [];
  if (editingTareaData.value.parcial_id) {
    try {
      const response = await api.get(`/parciales/${editingTareaData.value.parcial_id}/parametros`);
      parametrosEdicion.value = response.data.data || [];
    } catch (e) {
      console.error('Error cargando parámetros para edición:', e);
      parametrosEdicion.value = [];
    }
  }
};

const submitCreate = async () => {
  console.log('TareasSection submitCreate llamado');
  console.log('TareasSection newTareaArchivo:', newTareaArchivo.value);
  try {
    await createTarea();
  } catch (e) {
    alert(e.response?.data?.message || 'Error al crear la tarea');
  }
};

const submitUpdate = async () => {
  try {
    await updateTarea(editingTareaId.value, editingTareaData.value);
    cancelEditTarea();
  } catch (e) {
    alert(e.response?.data?.message || 'Error al actualizar la tarea');
  }
};

const handleDelete = async (tareaId, moduloId) => {
  if (!confirm('¿Eliminar esta tarea?')) return;
  try {
    await deleteTarea(tareaId, moduloId);
  } catch (e) {
    alert(e.response?.data?.message || 'Error al eliminar la tarea');
  }
};

const verEntregasTarea = (tareaId) => {
  router.push(`/profesor/materia/${props.materiaId}/tarea/${tareaId}`);
};

const downloadArchivo = async (tarea) => {
  try {
    const response = await api.get(`/tareas/${tarea.id}/descargar`);
    if (response.data.download_url) {
      window.open(response.data.download_url, '_blank');
    }
  } catch (e) {
    console.error('Error downloading archivo:', e);
  }
};

onMounted(async () => {
  // Cargar parciales para el primer módulo si existe
  if (props.modulos && props.modulos.length > 0) {
    await cargarParciales(props.modulos[0].id);
  }
  await fetchAllTareas();
});
</script>

<template>
  <section class="tareas-section">
    <div class="section-header">
      <h2 class="section-title">{{ isEstudiante ? 'Mis Tareas' : 'Tareas' }}</h2>
    </div>

    <!-- Formulario crear tarea: SOLO profesor -->
    <div v-if="isProfesor && showAddTarea" class="tarea-form-inline">
      <div class="tarea-form-row">
        <div class="form-group">
          <label class="form-label">Módulo *</label>
          <select v-model="newTareaModuloId" class="tarea-input" @change="cargarParciales(newTareaModuloId)">
            <option value="">Seleccionar...</option>
            <option v-for="modulo in modulos" :key="modulo.id" :value="modulo.id">
              {{ modulo.nombre }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Título *</label>
          <input v-model="newTareaTitulo" type="text" placeholder="Ej: Tarea de matemáticas" class="tarea-input" />
        </div>
        <div class="form-group">
          <label class="form-label">Fecha límite *</label>
          <input v-model="newTareaFechaLimite" type="datetime-local" class="tarea-input" />
        </div>
        <div class="form-group">
          <label class="form-label">Puntaje máximo</label>
          <input v-model.number="newTareaPuntajeMaximo" type="number" min="1" max="1000" class="tarea-input" style="width: 100px;" :placeholder="notaMaximaSugerida ? `Sugerido: ${notaMaximaSugerida}` : ''" />
        </div>
        <div class="form-group">
          <label class="form-label">Parcial</label>
          <select v-model="newTareaParcialId" class="tarea-input" @change="handleParcialChange">
            <option :value="null">Seleccionar parcial...</option>
            <option v-for="parcial in parciales" :key="parcial.id" :value="parcial.id">
              {{ parcial.nombre }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Parámetro</label>
          <select v-model="newTareaParametroId" class="tarea-input" :disabled="!newTareaParcialId">
            <option :value="null">Seleccionar parámetro...</option>
            <option v-for="param in parametros" :key="param.id" :value="param.id">
              {{ param.nombre }} ({{ param.nota_maxima_default }} pts)
            </option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Descripción</label>
        <textarea v-model="newTareaDescripcion" placeholder="Instrucciones de la tarea" class="tarea-textarea" rows="2"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Archivo adjunto</label>
        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.ppt,.pptx" @change="handleTareaFileSelect($event.target.files[0])" class="file-input" />
      </div>
      <div class="tarea-form-actions">
        <button @click="submitCreate" class="btn-primary btn-sm" :disabled="savingTarea || !newTareaModuloId || !newTareaTitulo.trim() || !newTareaFechaLimite">
          {{ savingTarea ? 'Guardando...' : 'Crear Tarea' }}
        </button>
        <button @click="resetNewTareaForm" class="btn-secondary btn-sm">Cancelar</button>
      </div>
    </div>

    <!-- Botón agregar tarea: SOLO profesor -->
    <button v-if="isProfesor && !showAddTarea" @click="showAddTarea = true" class="btn-add-tarea">+ Agregar Tarea</button>

    <!-- Lista de tareas -->
    <div v-if="loadingTareas" class="loading">Cargando tareas...</div>

    <div v-else class="tareas-list">
      <div v-for="modulo in modulos" :key="modulo.id" class="tareas-por-modulo">
        <div v-if="tareas[modulo.id]?.length > 0" class="modulo-tareas">
          <h3 class="modulo-tareas-title">📦 {{ modulo.nombre }}</h3>

          <div v-for="tarea in tareas[modulo.id]" :key="tarea.id" class="tarea-card">
            <!-- Modo edición: SOLO profesor -->
            <template v-if="isProfesor && editingTareaId === tarea.id">
              <div class="tarea-edit-form">
                <div class="form-group">
                  <label class="form-label">Título</label>
                  <input v-model="editingTareaData.titulo" type="text" class="tarea-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">Descripción</label>
                  <textarea v-model="editingTareaData.descripcion" class="tarea-textarea" rows="2"></textarea>
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha límite</label>
                  <input v-model="editingTareaData.fecha_limite" type="datetime-local" class="tarea-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">Puntaje máximo</label>
                  <input v-model.number="editingTareaData.puntaje_maximo" type="number" min="1" max="1000" class="tarea-input" style="width: 100px;" />
                </div>
                <div class="form-group">
                  <label class="form-label">Parcial</label>
                  <select v-model="editingTareaData.parcial_id" class="tarea-input" @change="handleEditParcialChange">
                    <option :value="null">Seleccionar parcial...</option>
                    <option v-for="parcial in parciales" :key="parcial.id" :value="parcial.id">
                      {{ parcial.nombre }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Parámetro</label>
                  <select v-model="editingTareaData.parametro_id" class="tarea-input" :disabled="!editingTareaData.parcial_id">
                    <option :value="null">Seleccionar parámetro...</option>
                    <option v-for="param in parametrosEdicion" :key="param.id" :value="param.id">
                      {{ param.nombre }} ({{ param.nota_maxima_default }} pts)
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Archivo adjunto (reemplazar)</label>
                  <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.ppt,.pptx" @change="handleEditTareaFileSelect($event.target.files[0])" class="file-input" />
                  <small v-if="tarea.archivo_nombre" class="file-current">Archivo actual: {{ tarea.archivo_nombre }}</small>
                </div>
                <div class="tarea-edit-actions">
                  <button @click="submitUpdate" class="btn-icon save" :disabled="savingTarea">✓</button>
                  <button @click="cancelEditTarea" class="btn-icon cancel">✕</button>
                </div>
              </div>
            </template>

            <!-- Modo visualización -->
            <template v-else>
              <div class="tarea-card-new">
                <!-- Header de la tarea -->
                <div class="tarea-card-header">
                  <h4 class="tarea-titulo">{{ tarea.titulo }}</h4>
                  <span v-if="tarea.descripcion" class="tarea-descripcion">{{ tarea.descripcion }}</span>
                </div>

                <!-- Info de la tarea -->
                <div class="tarea-card-body">
                  <div class="tarea-meta">
                    <!-- Fecha límite -->
                    <div class="meta-item">
                      <span class="meta-icon">📅</span>
                      <div class="meta-content">
                        <span class="meta-label">Fecha límite</span>
                        <span class="meta-valor" :style="{ color: getEstadoColor(tarea.estado) }">
                          {{ formatFecha(tarea.fecha_limite) }}
                        </span>
                      </div>
                      <span class="estado-badge" :class="tarea.estado">
                        <template v-if="tarea.ha_entregado">✅ Entregado</template>
                        <template v-else>{{ tarea.estado === 'vencida' ? '🔴 Vencida' : '🟡 Pendiente' }}</template>
                      </span>
                    </div>

                    <!-- Puntaje -->
                    <div class="meta-item">
                      <span class="meta-icon">📊</span>
                      <div class="meta-content">
                        <span class="meta-label">Puntaje máximo</span>
                        <span class="meta-valor">{{ tarea.puntaje_maximo || 10 }} puntos</span>
                      </div>
                    </div>

                    <!-- Archivo adjunto -->
                    <div v-if="tarea.archivo_nombre" class="meta-item">
                      <span class="meta-icon">📎</span>
                      <div class="meta-content">
                        <span class="meta-label">Archivo adjunto</span>
                        <span class="archivo-link" @click="downloadArchivo(tarea)">
                          {{ tarea.archivo_nombre }}
                          <span class="archivo-size">({{ formatFileSize(tarea.archivo_tamano) }})</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Acciones profesor -->
                <div v-if="isProfesor" class="tarea-card-actions">
                  <button @click="startEditTarea(tarea, modulo.id)" class="btn-action edit">✏️ Editar</button>
                  <button @click="handleDelete(tarea.id, modulo.id)" class="btn-action delete">🗑️ Eliminar</button>
                  <button @click="verEntregasTarea(tarea.id)" class="btn-action primary">📋 Ver Entregas</button>
                </div>

                <!-- Entrega del estudiante -->
                <div v-if="isEstudiante" class="mi-entrega-section mt-3">
                  <SubirEntrega :tareaId="tarea.id" :tareaData="tarea" />
                </div>

                <!-- Retroalimentación: SOLO si el profesor calificó -->
                <div v-if="isEstudiante && tarea.mi_entrega && tarea.mi_entrega.nota !== null" class="tarea-retroalimentacion">
                  <div class="retro-header">
                    <span class="retro-icon">🎯</span>
                    <span class="retro-titulo">Retroalimentación</span>
                  </div>
                  <div class="retro-body">
                    <!-- Nota -->
                    <div class="retro-nota">
                      <span class="nota-label">Calificación:</span>
                      <span class="nota-valor" :class="{ 'aprobado': tarea.mi_entrega.nota >= 7, 'reprobado': tarea.mi_entrega.nota < 7 }">
                        {{ Number(tarea.mi_entrega.nota).toFixed(tarea.mi_entrega.nota % 1 === 0 ? 0 : 2) }} / {{ tarea.puntaje_maximo || 10 }}
                      </span>
                    </div>
                    <!-- Observación del profesor -->
                    <div v-if="tarea.mi_entrega.observaciones" class="retro-observacion">
                      <span class="observacion-label">Comentario del profesor:</span>
                      <p class="observacion-text">{{ tarea.mi_entrega.observaciones }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div v-if="Object.values(tareas).flat().length === 0" class="empty-state">
      <p>{{ isEstudiante ? 'No hay tareas asignadas' : 'No hay tareas creadas' }}</p>
    </div>
  </section>
</template>

<style scoped>
/* Nueva tarjeta de tarea */
.tarea-card-new {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.tarea-card-new:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.tarea-card-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafafa;
}

.tarea-card-header .tarea-titulo {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.tarea-card-header .tarea-descripcion {
  margin: 0;
  font-size: 14px;
  color: #64748b;
}

.tarea-card-body {
  padding: 16px 20px;
}

.tarea-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.meta-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.meta-valor {
  font-size: 14px;
  color: #334155;
  font-weight: 500;
}

.estado-badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 20px;
  font-weight: 500;
}

.estado-badge.pendiente {
  background: #fef3c7;
  color: #92400e;
}

.estado-badge.vencida {
  background: #fee2e2;
  color: #991b1b;
}

.archivo-link {
  color: #3b82f6;
  text-decoration: underline;
  cursor: pointer;
  font-size: 14px;
}

.archivo-link:hover {
  color: #2563eb;
}

.archivo-size {
  color: #94a3b8;
  font-size: 12px;
  margin-left: 4px;
}

/* Acciones profesor */
.tarea-card-actions {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #f1f5f9;
  background: #fafafa;
}

.btn-action {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action.edit {
  background: #eff6ff;
  color: #1d4ed8;
}

.btn-action.edit:hover {
  background: #dbeafe;
}

.btn-action.delete {
  background: #fef2f2;
  color: #dc2626;
}

.btn-action.delete:hover {
  background: #fee2e2;
}

.btn-action.primary {
  background: #3b82f6;
  color: white;
}

.btn-action.primary:hover {
  background: #2563eb;
}

/* Retroalimentación */
.tarea-retroalimentacion {
  margin: 16px 20px 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%);
  border: 1px solid #fcd34d;
  border-radius: 10px;
  overflow: hidden;
}

.retro-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(251, 191, 36, 0.2);
  border-bottom: 1px solid #fcd34d;
}

.retro-icon {
  font-size: 16px;
}

.retro-titulo {
  font-weight: 600;
  color: #92400e;
  font-size: 14px;
}

.retro-body {
  padding: 16px;
}

.retro-nota {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.nota-label {
  font-weight: 500;
  color: #92400e;
  font-size: 14px;
}

.nota-valor {
  font-size: 20px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 6px;
}

.nota-valor.aprobado {
  background: #dcfce7;
  color: #166534;
}

.nota-valor.reprobado {
  background: #fee2e2;
  color: #991b1b;
}

.retro-observacion {
  border-top: 1px solid #fcd34d;
  padding-top: 12px;
}

.observacion-label {
  display: block;
  font-weight: 500;
  color: #92400e;
  font-size: 13px;
  margin-bottom: 6px;
}

.observacion-text {
  margin: 0;
  color: #78350f;
  font-size: 14px;
  line-height: 1.5;
  font-style: italic;
}

/* Sección de entrega del estudiante */
.mi-entrega-section {
  margin: 0 20px 16px;
}
</style>
