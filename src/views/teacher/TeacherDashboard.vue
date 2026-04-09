<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../../composables/useAuth';
import { apiNormalized } from '../../services/apiNormalized';

const router = useRouter();
const { user, fetchUser } = useAuth();

// Estado
const loading = ref(true);
const error = ref('');
const dashboardData = ref(null);
const coursesData = ref([]);

// Cargar datos del dashboard
const fetchDashboard = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const [dashboardRes, coursesRes] = await Promise.all([
      apiNormalized.get('/teacher/dashboard'),
      apiNormalized.get('/teacher/courses/stats')
    ]);
    
    dashboardData.value = dashboardRes.data?.summary || null;
    coursesData.value = coursesRes.data?.courses || [];
  } catch (e) {
    console.error('Error fetching dashboard:', e);
    error.value = 'Error al cargar las estadísticas del dashboard';
  } finally {
    loading.value = false;
  }
};

// Obtener clase para estado del curso
const getStatusClass = (status, approvedPct, failedPct) => {
  if (status === 'cerrado') return 'status-closed';
  if (approvedPct > 0 && approvedPct > failedPct) return 'status-approved';
  if (failedPct > 0 && failedPct > approvedPct) return 'status-failed';
  return 'status-open';
};

// Obtener texto de estado
const getStatusText = (status) => {
  return status === 'cerrado' ? 'Cerrado' : 'Abierto';
};

// Obtener año lectivo para mostrar
const schoolYearName = computed(() => schoolYear.value || '');

// Cursos agrupados por materia (para mostrar materias juntas)
const coursesDataGrouped = computed(() => {
  const courses = coursesData.value;
  if (!courses || courses.length === 0) return [];
  
  // Ordenar por nombre de materia, luego por sección
  return [...courses].sort((a, b) => {
    const nameA = a.subject_name?.toLowerCase() || '';
    const nameB = b.subject_name?.toLowerCase() || '';
    if (nameA !== nameB) return nameA.localeCompare(nameB);
    return (a.section_name || '').localeCompare(b.section_name || '');
  });
});

// Navegar a la materia con la sección
const goToMateria = (subjectId, sectionId) => {
  router.push({
    path: `/profesor/materia/${subjectId}`,
    query: { section: sectionId }
  });
};

// Datos originales (horario y materias)
const courses = ref([]);  // Cursos independientes (materia + sección)
const schedule = ref([]);
const schoolYear = ref(null);

// Estado para el panel de secciones
const showSectionsPanel = ref(false);
const selectedSubject = ref(null);

// Obtener materias agrupadas (una tarjeta por materia, con sus secciones)
const subjectsGrouped = computed(() => {
  const map = {};
  
  for (const course of courses.value) {
    const key = course.subject_id;
    if (!map[key]) {
      map[key] = {
        id: course.subject_id,
        name: course.subject_name,
        sections: []
      };
    }
    map[key].sections.push({
      id: course.section_id,
      name: course.section_name,
      grade: course.grade
    });
  }
  
  return Object.values(map);
});

// Abrir panel de secciones
const openSectionsPanel = (subject) => {
  selectedSubject.value = subject;
  showSectionsPanel.value = true;
};

// Cerrar panel
const closeSectionsPanel = () => {
  showSectionsPanel.value = false;
  selectedSubject.value = null;
};

// Días de la semana para el horario
const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Cargar todos los datos al inicio
onMounted(async () => {
  if (!user.value) {
    await fetchUser();
  }
  await Promise.all([
    fetchDashboard(),
    fetchCourses(),
    fetchSchedule()
  ]);
  loading.value = false;
});

const fetchCourses = async () => {
  try {
    const response = await apiNormalized.get('/my-subjects');
    courses.value = response.data || [];
    schoolYear.value = response.meta?.school_year || null;
  } catch (e) {
    console.error('Error fetching courses:', e);
  }
};

const fetchSchedule = async () => {
  try {
    const response = await apiNormalized.get('/my-schedule');
    schedule.value = response.data || [];
  } catch (e) {
    console.error('Error fetching schedule:', e);
  }
};

// Obtener todas las horas que cubren las clases
const hours = computed(() => {
  if (!schedule.value || schedule.value.length === 0) {
    return [];
  }
  
  let minHour = 23;
  let maxHour = 0;
  
  schedule.value.forEach(item => {
    if (item.start_time && item.end_time) {
      const startHour = parseInt(item.start_time.split(':')[0], 10);
      const endHour = parseInt(item.end_time.split(':')[0], 10);
      
      if (!isNaN(startHour) && startHour < minHour) {
        minHour = startHour;
      }
      if (!isNaN(endHour) && endHour > maxHour) {
        maxHour = endHour;
      }
    }
  });
  
  const result = [];
  for (let h = minHour; h <= maxHour; h++) {
    if (h >= 5 && h <= 22) {
      result.push(h);
    }
  }
  
  return result;
});

// Obtener clase para una celda específica
const getScheduleForCell = (day, hour) => {
  return schedule.value.find(item => {
    if (item.day !== day) return false;
    if (!item.start_time || !item.end_time) return false;
    const startHour = parseInt(item.start_time.split(':')[0], 10);
    const endHour = parseInt(item.end_time.split(':')[0], 10);
    if (isNaN(startHour) || isNaN(endHour)) return false;
    return hour >= startHour && hour < endHour;
  });
};
</script>

<template>
  <div class="teacher-dashboard">
    <!-- Mensaje de error -->
    <div v-if="error" class="error-message">{{ error }}</div>

    <!-- Loading -->
    <div v-if="loading" class="loading">Cargando...</div>

    <template v-else>
      <!-- Header de Bienvenida -->
      <div class="welcome-section">
        <h1>Bienvenido, {{ user?.first_name }} {{ user?.last_name }}</h1>
        <p v-if="schoolYear" class="school-year">Año Lectivo: {{ schoolYear }}</p>
      </div>

      <!-- SECCIÓN: ESTADÍSTICAS DEL DASHBOARD -->
      <section class="stats-section">
        <h2 class="section-title">Resumen Académico</h2>
        
        <!-- Cards de estadísticas -->
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-icon">📚</div>
            <div class="stat-content">
              <span class="stat-value">{{ dashboardData?.total_courses || 0 }}</span>
              <span class="stat-label">Total Cursos</span>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-content">
              <span class="stat-value">{{ dashboardData?.total_students || 0 }}</span>
              <span class="stat-label">Total Estudiantes</span>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <span class="stat-value">{{ dashboardData?.closed_courses || 0 }}</span>
              <span class="stat-label">Cursos Cerrados</span>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">🔓</div>
            <div class="stat-content">
              <span class="stat-value">{{ dashboardData?.open_courses || 0 }}</span>
              <span class="stat-label">Cursos Abiertos</span>
            </div>
          </div>
        </div>
        
        <!-- Lista de cursos con estadísticas -->
        <div v-if="coursesDataGrouped.length > 0" class="courses-stats-list">
          <!-- Fila de Año Lectivo -->
          <div class="year-header-row">
            <span class="year-label">📅 Año Lectivo:</span>
            <span class="year-value">{{ coursesDataGrouped[0]?.school_year || 'No definido' }}</span>
          </div>
          
          <div class="course-stat-row header">
            <div class="course-col">Materia</div>
            <div class="section-col">Sección</div>
            <div class="students-col">Estudiantes</div>
            <div class="grade-col">Promedio</div>
            <div class="percent-col">Aprobados</div>
            <div class="percent-col">Reprobados</div>
            <div class="status-col">Estado</div>
          </div>
          
          <div 
            v-for="course in coursesDataGrouped" 
            :key="`${course.subject_id}-${course.section_id}`"
            class="course-stat-row clickable"
            :class="getStatusClass(course.status, course.approved_percentage, course.failed_percentage)"
            @click="goToMateria(course.subject_id, course.section_id)"
          >
            <div class="course-col">{{ course.subject_name }}</div>
            <div class="section-col">{{ course.section_name }}</div>
            <div class="students-col">{{ course.registered_students }}/{{ course.total_students }}</div>
            <div class="grade-col">{{ course.average_grade ? course.average_grade.toFixed(2) : '-' }}</div>
            <div class="percent-col approved">
              <span class="percent-badge approved">{{ course.approved_percentage }}%</span>
            </div>
            <div class="percent-col failed">
              <span class="percent-badge failed">{{ course.failed_percentage }}%</span>
            </div>
            <div class="status-col">
              <span class="status-badge" :class="course.status">
                {{ getStatusText(course.status) }}
              </span>
            </div>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <p>No hay cursos con estadísticas</p>
        </div>
      </section>

      <!-- SECCIÓN: MIS MATERIAS -->
      <section class="subjects-section">
        <h2 class="section-title">Mis Materias</h2>
        
        <div v-if="subjectsGrouped.length > 0" class="subjects-grid">
          <div 
            v-for="subject in subjectsGrouped" 
            :key="subject.id" 
            class="subject-card clickable"
            @click="openSectionsPanel(subject)"
          >
            <div class="subject-icon">📚</div>
            <div class="subject-info">
              <h3 class="subject-name">{{ subject.name }}</h3>
              <div class="subject-sections">
                <span class="section-count">
                  {{ subject.sections.length }} paralelo{{ subject.sections.length > 1 ? 's' : '' }}
                </span>
              </div>
            </div>
            <div class="card-arrow">→</div>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <p>No tienes materias asignadas</p>
        </div>
      </section>

      <!-- Panel de Selección de Paralelo -->
      <div v-if="showSectionsPanel" class="panel-overlay" @click.self="closeSectionsPanel">
        <div class="sections-panel">
          <div class="panel-header">
            <h3>{{ selectedSubject?.name }}</h3>
            <button class="panel-close" @click="closeSectionsPanel">✕</button>
          </div>
          <div class="panel-body">
            <div 
              v-for="section in selectedSubject?.sections" 
              :key="section.id"
              class="panel-section-item"
              @click="goToMateria(selectedSubject.id, section.id); closeSectionsPanel()"
            >
              <div class="section-info">
                <span class="section-icon">📖</span>
                <span class="section-name">{{ section.grade }} - Sección {{ section.name }}</span>
              </div>
              <span class="section-go">→</span>
            </div>
          </div>
        </div>
      </div>

      <!-- SECCIÓN: HORARIO -->
      <section class="schedule-section">
        <h2 class="section-title">Mi Horario</h2>
        
        <div v-if="schedule.length > 0" class="schedule-grid-wrapper">
          <div class="schedule-grid">
            <!-- Encabezado -->
            <div class="grid-header">
              <div class="time-header">Hora</div>
              <div 
                v-for="day in days" 
                :key="day" 
                class="day-header"
              >
                {{ day }}
              </div>
            </div>
            
            <!-- Cuerpo -->
            <div class="grid-body">
              <div 
                v-for="hour in hours" 
                :key="hour" 
                class="grid-row"
              >
                <div class="time-cell">{{ hour.toString().padStart(2, '0') }}:00</div>
                <div 
                  v-for="day in days" 
                  :key="day" 
                  class="schedule-cell"
                >
                  <template v-if="getScheduleForCell(day, hour)">
                    <div class="schedule-content">
                      <div class="subject-name">
                        {{ getScheduleForCell(day, hour).subject?.name }}
                      </div>
                      <div class="section-name">
                        {{ getScheduleForCell(day, hour).section?.name }}
                      </div>
                      <div class="time-range">
                        {{ getScheduleForCell(day, hour).start_time }} - 
                        {{ getScheduleForCell(day, hour).end_time }}
                      </div>
                    </div>
                  </template>
                  <div v-else class="empty-cell"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <p>No tienes clases programadas</p>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.teacher-dashboard {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Error y Loading */
.error-message {
  background: #fee2e2;
  color: #991b1b;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.loading {
  text-align: center;
  padding: 48px;
  color: #6b7280;
  font-size: 16px;
}

/* Welcome Section */
.welcome-section {
  margin-bottom: 32px;
}

.welcome-section h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.school-year {
  color: #6b7280;
  font-size: 14px;
}

/* Section Titles */
.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.subsection-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 24px 0 12px;
}

/* Stats Section */
.stats-section {
  margin-bottom: 32px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 12px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
}

/* Courses Stats List */
.courses-stats-list {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.year-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #eff6ff;
  border-bottom: 2px solid #3b82f6;
}

.year-label {
  font-weight: 600;
  color: #1e40af;
}

.year-value {
  color: #1e40af;
}

.course-stat-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 100px 100px 100px;
  gap: 12px;
  padding: 12px 16px;
  align-items: center;
  border-bottom: 1px solid #f3f4f6;
}

.course-stat-row.clickable {
  cursor: pointer;
  transition: background-color 0.2s;
}

.course-stat-row.clickable:hover {
  background-color: #f3f4f6;
}

.course-stat-row.header {
  background: #f9fafb;
  font-weight: 600;
  font-size: 13px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.course-stat-row:last-child {
  border-bottom: none;
}

.course-stat-row.status-closed {
  background: #f9fafb;
}

.course-stat-row.status-approved {
  background: #f0fdf4;
}

.course-stat-row.status-failed {
  background: #fef2f2;
}

.course-col {
  font-weight: 500;
  color: #1f2937;
}

.section-col {
  color: #6b7280;
  font-size: 14px;
}

.year-col {
  color: #6b7280;
  font-size: 13px;
}

.students-col, .grade-col {
  color: #374151;
  font-size: 14px;
}

.percent-col {
  display: flex;
  justify-content: center;
}

.percent-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.percent-badge.approved {
  background: #dcfce7;
  color: #166534;
}

.percent-badge.failed {
  background: #fee2e2;
  color: #991b1b;
}

.status-col {
  display: flex;
  justify-content: center;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.abierto {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.cerrado {
  background: #e5e7eb;
  color: #4b5563;
}

/* Subjects Section */
.subjects-section {
  margin-bottom: 32px;
}

.subjects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.subject-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.subject-main {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.subject-main:hover {
  background-color: #f9fafb;
}

.subject-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}

.subject-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eff6ff;
  border-radius: 12px;
}

.subject-info {
  flex: 1;
}

.subject-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.subject-sections {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.section-tag {
  background: #f3f4f6;
  color: #6b7280;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.card-arrow {
  color: #9ca3af;
  font-size: 20px;
  transition: transform 0.2s;
}

.card-arrow.rotated {
  transform: rotate(180deg);
}

/* Sections Dropdown */
.sections-dropdown {
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 8px;
}

.section-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.section-item:hover {
  background-color: #eff6ff;
}

.section-badge {
  background: white;
  border: 1px solid #e5e7eb;
  color: #374151;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.section-arrow {
  color: #3b82f6;
  font-size: 16px;
}

.section-count {
  background: #e5e7eb;
  color: #6b7280;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

/* Panel de Selección de Paralelo */
.panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.sections-panel {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.panel-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.panel-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.panel-close:hover {
  color: #1f2937;
}

.panel-body {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.panel-section-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e5e7eb;
}

.panel-section-item:hover {
  background: #eff6ff;
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.section-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-icon {
  font-size: 24px;
}

.section-name {
  font-size: 15px;
  font-weight: 500;
  color: #1f2937;
}

.section-go {
  font-size: 20px;
  color: #3b82f6;
}

/* Schedule Section */
.schedule-section {
  margin-bottom: 32px;
}

.schedule-grid-wrapper {
  overflow-x: auto;
}

.schedule-grid {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  min-width: 800px;
}

.grid-header {
  display: grid;
  grid-template-columns: 80px repeat(6, 1fr);
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.time-header, .day-header {
  padding: 12px 8px;
  text-align: center;
  font-weight: 600;
  font-size: 13px;
  color: #6b7280;
}

.grid-body {
  max-height: 400px;
  overflow-y: auto;
}

.grid-row {
  display: grid;
  grid-template-columns: 80px repeat(6, 1fr);
  border-bottom: 1px solid #f3f4f6;
}

.grid-row:last-child {
  border-bottom: none;
}

.time-cell {
  padding: 12px 8px;
  text-align: center;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  border-right: 1px solid #f3f4f6;
  background: #f9fafb;
}

.schedule-cell {
  border-right: 1px solid #f3f4f6;
  min-height: 60px;
  position: relative;
}

.schedule-cell:last-child {
  border-right: none;
}

.schedule-content {
  padding: 8px;
  background: #eff6ff;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.schedule-content .subject-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e40af;
}

.schedule-content .section-name {
  font-size: 11px;
  color: #6b7280;
}

.schedule-content .time-range {
  font-size: 10px;
  color: #9ca3af;
  margin-top: auto;
}

.empty-cell {
  height: 100%;
  min-height: 60px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 32px;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px dashed #e5e7eb;
}
</style>
