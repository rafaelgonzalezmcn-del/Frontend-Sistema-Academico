<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { apiNormalized } from '@/services/apiNormalized';

const route = useRoute();
const { user } = useAuth();

// Props
const props = defineProps({
  studentId: {
    type: Number,
    required: true
  }
});

// Estado
const loading = ref(true);
const courses = ref([]);
const error = ref('');
const canViewGrades = ref(false);
const showParciales = ref({}); // Track which parciales are expanded

// Determinar si es el propio estudiante
const isOwnProfile = computed(() => {
  return user.value?.id === props.studentId;
});

// Cargar historial académico
const loadHistory = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    console.log('Cargando historial para estudiante:', props.studentId);
    const response = await apiNormalized.get(`/students/${props.studentId}/courses`);
    console.log('Response normalizada:', response);
    
    // Con apiNormalized:
    // - response.data = los datos normalizados (el array de cursos)
    // - response.raw = la respuesta original de axios
    // - response.raw.data = {data: [...], can_view_grades: true}
    
    courses.value = response.data || [];
    console.log('Courses asignados:', courses.value);
    
    // can_view_grades viene en response.raw.data
    canViewGrades.value = response.raw?.data?.can_view_grades || false;
    console.log('canViewGrades:', canViewGrades.value);
    
  } catch (e) {
    console.error('Error loading history:', e);
    error.value = 'Error al cargar el historial académico';
  } finally {
    loading.value = false;
  }
};

// Agrupar por año lectivo
const coursesByYear = computed(() => {
  const grouped = {};
  
  courses.value.forEach(course => {
    const year = course.school_year || 'Sin año';
    if (!grouped[year]) {
      grouped[year] = [];
    }
    grouped[year].push(course);
  });
  
  return grouped;
});

// Obtener clases según estado
const getStatusClass = (status) => {
  if (status === 'aprobado') return 'status-approved';
  if (status === 'reprobado') return 'status-failed';
  if (status === 'concluido') return 'status-completed';
  if (status === 'retirado') return 'status-withdrawn';
  return 'status-active';
};

// Obtener texto del estado
const getStatusLabel = (status) => {
  const labels = {
    'cursando': 'Cursando',
    'aprobado': 'Aprobado',
    'reprobado': 'Reprobado',
    'concluido': 'Concluido',
    'retirado': 'Retirado'
  };
  return labels[status] || status;
};

// Toggle mostrar parciales
const toggleParciales = (index) => {
  showParciales.value[index] = !showParciales.value[index];
};

onMounted(() => {
  loadHistory();
});
</script>

<template>
  <div class="historial-academico">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando historial académico...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="loadHistory" class="btn-retry">Reintentar</button>
    </div>

    <!-- Vacío -->
    <div v-else-if="courses.length === 0" class="empty-state">
      <div class="empty-icon">📚</div>
      <p>No hay cursos registrados en el historial académico.</p>
    </div>

    <!-- Lista de cursos -->
    <div v-else class="history-content">
      <div v-for="(yearCourses, year) in coursesByYear" :key="year" class="year-group">
        <h3 class="year-title">{{ year }}</h3>
        
        <div class="courses-list">
          <div v-for="(course, index) in yearCourses" :key="course.subject + '-' + course.section + '-' + index" class="course-card">
            <div class="course-info">
              <h4 class="course-subject">{{ course.subject }}</h4>
              <p class="course-section">Sección {{ course.section }}</p>
            </div>
            
            <div class="course-status">
              <span :class="['status-badge', getStatusClass(course.status)]">
                {{ getStatusLabel(course.status) }}
              </span>
            </div>
            
            <div v-if="course.final_grade !== undefined" class="course-grade">
              <span class="grade-value">
                {{ course.total_score_obtained || '-' }} / {{ course.total_score_possible || '-' }}
              </span>
              <span class="grade-label">{{ course.final_grade }}%</span>
            </div>
            
            <!-- Notas de Parciales (expandible) -->
            <div v-if="course.parcial_grades && course.parcial_grades.length > 0" class="parciales-section">
              <div class="parciales-toggle" @click="toggleParciales(index)">
                <span class="toggle-icon">{{ showParciales[index] ? '▼' : '▶' }}</span>
                <span class="toggle-text">Ver parciales</span>
              </div>
              
              <div v-if="showParciales[index]" class="parciales-list">
                <!-- Score total -->
                <div v-if="course.total_score_obtained && course.total_score_possible" class="score-total">
                  <span class="score-label">Puntaje Total:</span>
                  <span class="score-value">{{ course.total_score_obtained }} / {{ course.total_score_possible }} ({{ course.final_grade }}%)</span>
                </div>
                
                <div 
                  v-for="parcial in course.parcial_grades" 
                  :key="parcial.parcial_id"
                  class="parcial-item"
                >
                  <span class="parcial-nombre">{{ parcial.parcial_nombre }}</span>
                  <div class="parcial-details">
                    <span v-if="parcial.nota !== null" class="parcial-nota">
                      {{ parcial.nota }} / {{ parcial.nota_maxima }}
                      <span class="parcial-porcentaje">({{ parcial.porcentaje_obtenido }}%)</span>
                    </span>
                    <span v-else class="parcial-empty">Sin notas</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="course.closed_at" class="course-date">
              <span class="date-label">Cerrado:</span>
              <span class="date-value">{{ course.closed_at }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.historial-academico {
  padding: 0;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.btn-retry {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 12px;
}

.btn-retry:hover {
  background: #2563eb;
}

.year-group {
  margin-bottom: 24px;
}

.year-title {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.courses-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.course-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 12px;
}

.course-info {
  flex: 1;
  min-width: 200px;
}

.course-subject {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px;
}

.course-section {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.course-status {
  display: flex;
  align-items: center;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.status-approved {
  background: #d1fae5;
  color: #065f46;
}

.status-failed {
  background: #fee2e2;
  color: #991b1b;
}

.status-completed {
  background: #e0e7ff;
  color: #3730a3;
}

.status-withdrawn {
  background: #fef3c7;
  color: #92400e;
}

.status-active {
  background: #dbeafe;
  color: #1e40af;
}

.course-grade {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}

.grade-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.grade-label {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
}

.course-date {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 100px;
}

.date-label {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
}

.date-value {
  font-size: 14px;
  color: #374151;
}

/* Parciales Section */
.parciales-section {
  width: 100%;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e5e7eb;
}

.parciales-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #3b82f6;
  font-size: 13px;
  font-weight: 500;
}

.parciales-toggle:hover {
  color: #2563eb;
}

.toggle-icon {
  font-size: 10px;
}

.toggle-text {
  text-decoration: underline;
}

.parciales-list {
  margin-top: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.parcial-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.parcial-item:last-child {
  border-bottom: none;
}

.parcial-nombre {
  font-weight: 500;
  color: #374151;
}

.parcial-nota {
  font-weight: 600;
  color: #1f2937;
}

.parcial-porcentaje {
  font-weight: 400;
  color: #6b7280;
  margin-left: 4px;
  font-size: 12px;
}

.parcial-details {
  display: flex;
  align-items: center;
  gap: 8px;
}

.parcial-empty {
  font-weight: 400;
  color: #9ca3af;
  font-style: italic;
}

.score-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #e0e7ff;
  border-radius: 6px;
  margin-bottom: 12px;
}

.score-label {
  font-weight: 600;
  color: #3730a3;
}

.score-value {
  font-weight: 700;
  color: #3730a3;
}
</style>
