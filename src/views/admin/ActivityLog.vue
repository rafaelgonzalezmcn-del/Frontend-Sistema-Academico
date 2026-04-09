<script setup>
import { ref, onMounted } from 'vue';
import { apiNormalized } from '../../services/apiNormalized';

const logs = ref([]);
const loading = ref(true);
const error = ref('');
const currentPage = ref(1);
const totalPages = ref(1);

const fetchLogs = async (page = 1) => {
  try {
    loading.value = true;
    // El servicio ahora devuelve respuesta normalizada
    const response = await apiNormalized.get(`/activity-logs?page=${page}`);
    logs.value = response.data || [];
    // Los metadatos de paginación vienen en response.raw.data
    currentPage.value = response.raw?.data?.current_page || 1;
    totalPages.value = response.raw?.data?.last_page || 1;
  } catch (err) {
    error.value = 'Error al cargar el registro de actividades';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getIcon = (description) => {
  if (description.includes('cread')) return '➕';
  if (description.includes('actualizad')) return '✏️';
  if (description.includes('eliminad') || description.includes('desactivad')) return '🗑️';
  return '📋';
};

const getChangeDetails = (changes) => {
  if (!changes) return null;
  
  const details = [];
  for (const [key, change] of Object.entries(changes)) {
    if (change.before !== change.after) {
      details.push({
        field: key,
        before: change.before,
        after: change.after
      });
    }
  }
  return details;
};

onMounted(() => {
  fetchLogs();
});
</script>

<template>
  <div class="activity-log-view">
    <div class="page-header">
      <h2>📜 Registro de Actividad</h2>
      <p>Historial de todas las acciones realizadas en el sistema</p>
    </div>

    <div v-if="loading" class="loading">
      Cargando registros...
    </div>

    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-else class="logs-container">
      <div class="logs-list">
        <div v-for="log in logs" :key="log.id" class="log-item">
          <div class="log-header">
            <div class="log-icon">{{ getIcon(log.description) }}</div>
            <div class="log-main">
              <div class="log-description">
                <span class="user-name">{{ log.user?.first_name || 'Sistema' }}</span>
                {{ log.description }}
                <span v-if="log.subject_type" class="subject-type">
                  ({{ getSubjectName(log.subject_type) }})
                </span>
              </div>
              <div class="log-meta">
                <span class="log-time">{{ formatTime(log.created_at) }}</span>
                <span v-if="log.ip_address" class="log-ip">{{ log.ip_address }}</span>
              </div>
            </div>
          </div>

          <!-- Detalles de cambios -->
          <div v-if="log.changes" class="log-changes">
            <div v-for="(change, field) in log.changes" :key="field" class="change-item">
              <span class="field-name">{{ getFieldLabel(field) }}:</span>
              <div class="change-values">
                <span class="before">{{ formatValue(change.before) }}</span>
                <span class="arrow">→</span>
                <span class="after">{{ formatValue(change.after) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Paginación -->
      <div v-if="totalPages > 1" class="pagination">
        <button 
          @click="fetchLogs(currentPage - 1)" 
          :disabled="currentPage === 1"
          class="page-btn"
        >
          Anterior
        </button>
        
        <span class="page-info">
          Página {{ currentPage }} de {{ totalPages }}
        </span>
        
        <button 
          @click="fetchLogs(currentPage + 1)" 
          :disabled="currentPage === totalPages"
          class="page-btn"
        >
          Siguiente
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    getSubjectName(subjectType) {
      const names = {
        'App\\Models\\User': 'Usuario',
        'App\\Models\\Section': 'Sección',
        'App\\Models\\Grade': 'Grado',
        'App\\Models\\Subject': 'Materia',
        'App\\Models\\SchoolYear': 'Año Lectivo',
        'App\\Models\\ClassSchedule': 'Horario'
      };
      return names[subjectType] || subjectType.split('\\').pop();
    },
    
    getFieldLabel(field) {
      const labels = {
        'first_name': 'Nombre',
        'last_name': 'Apellido',
        'email': 'Correo',
        'phone': 'Teléfono',
        'activo': 'Estado',
        'name': 'Nombre',
        'description': 'Descripción'
      };
      return labels[field] || field;
    },
    
    formatValue(value) {
      if (value === null || value === undefined) return '—';
      if (value === true) return 'Activo';
      if (value === false) return 'Inactivo';
      return String(value);
    }
  }
}
</script>

<style scoped>
.activity-log-view {
  padding: 30px;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h2 {
  margin: 0;
  color: #2c3e50;
}

.page-header p {
  color: #666;
  margin-top: 8px;
}

.loading, .error-message {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.error-message {
  background: #fee;
  color: #c33;
}

.logs-container {
  max-width: 900px;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.log-item {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border-left: 4px solid #3498db;
}

.log-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.log-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f7ff;
  border-radius: 50%;
}

.log-main {
  flex: 1;
}

.log-description {
  color: #2c3e50;
  margin-bottom: 8px;
}

.user-name {
  font-weight: 600;
  color: #3498db;
}

.subject-type {
  color: #999;
  font-size: 13px;
}

.log-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #666;
}

.log-changes {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 14px;
}

.change-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.change-item:last-child {
  margin-bottom: 0;
}

.field-name {
  font-weight: 600;
  color: #555;
  min-width: 120px;
}

.change-values {
  display: flex;
  align-items: center;
  gap: 8px;
}

.before {
  color: #e74c3c;
  text-decoration: line-through;
}

.after {
  color: #27ae60;
}

.arrow {
  color: #999;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 30px;
}

.page-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #f0f0f0;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #666;
}
</style>
