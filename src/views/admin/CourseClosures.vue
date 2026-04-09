<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { apiNormalized as api } from '../../services/apiNormalized';

const router = useRouter();

// State
const courses = ref([]);
const schoolYears = ref([]);
const grades = ref([]);
const sections = ref([]);
const loading = ref(true);
const closing = ref(false);
const error = ref({ message: '', type: '' });

// Filters
const filterSchoolYear = ref('');
const filterGrade = ref('');
const filterSection = ref('');
const showClosed = ref(false);

// Modal
const showConfirmModal = ref(false);
const selectedCourse = ref(null);
const observations = ref('');
const closeResult = ref(null);

// Computed
const filteredCourses = computed(() => {
  let result = courses.value;
  if (!showClosed.value) {
    result = result.filter(c => !c.is_closed);
  }
  if (filterGrade.value) {
    result = result.filter(c => c.grade_id === Number(filterGrade.value));
  }
  if (filterSection.value) {
    result = result.filter(c => c.section_id === Number(filterSection.value));
  }
  return result;
});

const pendingCount = computed(() => courses.value.filter(c => !c.is_closed).length);
const closedCount = computed(() => courses.value.filter(c => c.is_closed).length);

// Load data
const fetchData = async () => {
  loading.value = true;
  error.value = { message: '', type: '' };

  try {
    const params = {};
    if (filterSchoolYear.value) params.school_year_id = filterSchoolYear.value;
    if (filterGrade.value) params.grade_id = filterGrade.value;
    if (filterSection.value) params.section_id = filterSection.value;

    const [coursesRes, yearsRaw, gradesRes, sectionsRes] = await Promise.all([
      api.get('/admin/courses/pending-closure', { params }),
      api.get('/school-years?per_page=100'),
      api.get('/grades'),
      api.get('/sections?per_page=100'),
    ]);

    courses.value = coursesRes.data || [];
    schoolYears.value = yearsRaw?.data?.data || [];
    grades.value = gradesRes.data || [];
    sections.value = sectionsRes.data || [];

    // Auto-select active year
    if (!filterSchoolYear.value) {
      const active = schoolYears.value.find(y => y.active);
      if (active) filterSchoolYear.value = active.id;
    }
  } catch (e) {
    error.value = { message: 'Error al cargar cursos', type: 'server' };
  } finally {
    loading.value = false;
  }
};

const openCloseModal = (course) => {
  if (course.is_closed) return;
  selectedCourse.value = course;
  observations.value = '';
  closeResult.value = null;
  showConfirmModal.value = true;
};

const closeCourse = async () => {
  if (!selectedCourse.value) return;
  closing.value = true;
  closeResult.value = null;

  try {
    const res = await api.post(
      `/subjects/${selectedCourse.value.subject_id}/sections/${selectedCourse.value.section_id}/close`,
      { observations: observations.value || 'Cierre administrativo' }
    );
    closeResult.value = res.data;
    // Refresh data
    await fetchData();
  } catch (e) {
    closeResult.value = {
      error: e.response?.data?.message || Object.values(e.response?.data?.errors || {}).flat().join(', ') || 'Error al cerrar el curso',
    };
  } finally {
    closing.value = false;
  }
};

const closeModal = () => {
  showConfirmModal.value = false;
  selectedCourse.value = null;
  observations.value = '';
  closeResult.value = null;
};

onMounted(fetchData);
</script>

<template>
  <div class="course-closures-view">
    <div class="page-header">
      <div>
        <h2>Cierre de Cursos</h2>
        <p class="subtitle">Cerrar cursos pendientes que los profesores no han cerrado</p>
      </div>
      <button @click="fetchData" class="btn-secondary">🔄 Actualizar</button>
    </div>

    <!-- Stats -->
    <div class="stats-bar">
      <div class="stat-card pending">
        <span class="stat-number">{{ pendingCount }}</span>
        <span class="stat-label">Pendientes de cierre</span>
      </div>
      <div class="stat-card closed">
        <span class="stat-number">{{ closedCount }}</span>
        <span class="stat-label">Ya cerrados</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="filter-group">
        <label>Año Lectivo</label>
        <select v-model="filterSchoolYear" @change="fetchData">
          <option :value="''">Todos</option>
          <option v-for="year in schoolYears" :key="year.id" :value="year.id">
            {{ year.name }}{{ year.active ? ' (Activo)' : '' }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <label>Grado</label>
        <select v-model="filterGrade" @change="fetchData">
          <option :value="''">Todos</option>
          <option v-for="grade in grades" :key="grade.id" :value="grade.id">{{ grade.name }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Sección</label>
        <select v-model="filterSection" @change="fetchData">
          <option :value="''">Todas</option>
          <option v-for="section in sections" :key="section.id" :value="section.id">
            {{ section.grade?.name }} — {{ section.name }}
          </option>
        </select>
      </div>
      <div class="filter-group toggle-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="showClosed" />
          Mostrar cursos ya cerrados
        </label>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error.message" class="error-message">
      {{ error.message }}
      <button @click="fetchData" class="btn-retry">Reintentar</button>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="loading">Cargando cursos...</div>

    <!-- Courses table -->
    <template v-else>
      <table v-if="filteredCourses.length > 0" class="data-table">
        <thead>
          <tr>
            <th>Materia</th>
            <th>Sección</th>
            <th>Grado</th>
            <th>Año Lectivo</th>
            <th>Profesor</th>
            <th>Estudiantes</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="course in filteredCourses" :key="`${course.subject_id}-${course.section_id}`" :class="{ 'row-closed': course.is_closed }">
            <td><strong>{{ course.subject_name }}</strong></td>
            <td>{{ course.section_name }}</td>
            <td>{{ course.grade_name }}</td>
            <td>{{ course.school_year_name }}</td>
            <td>{{ course.professor }}</td>
            <td>{{ course.student_count }}</td>
            <td>
              <span v-if="course.is_closed" class="status-badge closed">✅ Cerrado</span>
              <span v-else class="status-badge pending">⏳ Pendiente</span>
            </td>
            <td>
              <button
                v-if="!course.is_closed"
                @click="openCloseModal(course)"
                class="btn-danger btn-sm"
              >
                Cerrar curso
              </button>
              <span v-else class="text-muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty-state">
        <div class="empty-icon">✅</div>
        <p>{{ showClosed ? 'No hay cursos registrados' : 'No hay cursos pendientes de cierre' }}</p>
      </div>
    </template>

    <!-- Confirm modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>⚠️ Cerrar Curso Administrativamente</h3>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="!closeResult">
            <div class="course-info">
              <p><strong>Materia:</strong> {{ selectedCourse?.subject_name }}</p>
              <p><strong>Sección:</strong> {{ selectedCourse?.grade_name }} — {{ selectedCourse?.section_name }}</p>
              <p><strong>Año:</strong> {{ selectedCourse?.school_year_name }}</p>
              <p><strong>Profesor:</strong> {{ selectedCourse?.professor }}</p>
              <p><strong>Estudiantes:</strong> {{ selectedCourse?.student_count }}</p>
            </div>

            <div class="warning-box">
              ⚠️ Esta acción cerrará el curso para todos los estudiantes, calculando notas finales automáticamente. Los estudiantes sin notas serán marcados como "concluido".
            </div>

            <div class="form-group">
              <label>Observaciones (opcional)</label>
              <textarea v-model="observations" rows="3" placeholder="Motivo del cierre administrativo..."></textarea>
            </div>
          </div>

          <div v-else>
            <div v-if="closeResult.error" class="result-error">
              ❌ {{ closeResult.error }}
            </div>
            <div v-else class="result-success">
              ✅ Curso cerrado correctamente — {{ closeResult.processed_students }} estudiante(s) procesado(s)
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button v-if="!closeResult" @click="closeModal" class="btn-cancel" :disabled="closing">Cancelar</button>
          <button v-if="!closeResult" @click="closeCourse" class="btn-danger" :disabled="closing">
            {{ closing ? 'Cerrando...' : 'Confirmar cierre' }}
          </button>
          <button v-if="closeResult" @click="closeModal" class="btn-primary">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.course-closures-view { max-width: 1400px; margin: 0 auto; padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-header h2 { margin: 0 0 4px; font-size: 24px; color: #111827; }
.subtitle { margin: 0; color: #6b7280; font-size: 14px; }

/* Stats */
.stats-bar { display: flex; gap: 16px; margin-bottom: 20px; }
.stat-card { flex: 1; padding: 16px; border-radius: 10px; text-align: center; border: 1px solid; }
.stat-card.pending { background: #fffbeb; border-color: #fde68a; }
.stat-card.closed { background: #f0fdf4; border-color: #bbf7d0; }
.stat-number { display: block; font-size: 28px; font-weight: 700; }
.stat-card.pending .stat-number { color: #b45309; }
.stat-card.closed .stat-number { color: #166534; }
.stat-label { font-size: 13px; color: #6b7280; margin-top: 4px; }

/* Filters */
.filters-bar { display: flex; gap: 16px; margin-bottom: 20px; padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; flex-wrap: wrap; }
.filter-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 160px; }
.filter-group label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
.filter-group select { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; background: white; }
.toggle-group { justify-content: flex-end; }
.checkbox-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: #374151; font-weight: 400; text-transform: none; letter-spacing: 0; }

/* Table */
.data-table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.data-table th { background: #f9fafb; padding: 12px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; }
.data-table td { padding: 10px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; }
.data-table tr:hover { background: #f9fafb; }
.row-closed { opacity: 0.6; }

/* Status badges */
.status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.status-badge.pending { background: #fef3c7; color: #92400e; }
.status-badge.closed { background: #dcfce7; color: #166534; }

/* Empty state */
.empty-state { text-align: center; padding: 60px 20px; background: #f9fafb; border-radius: 10px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-state p { color: #6b7280; font-size: 15px; }

/* Loading / Error */
.loading { text-align: center; padding: 40px; color: #6b7280; }
.error-message { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
.btn-retry { padding: 6px 14px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 12px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e5e7eb; }
.modal-header h3 { margin: 0; font-size: 18px; color: #111827; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280; }
.modal-body { padding: 20px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid #e5e7eb; }

.course-info { background: #f9fafb; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
.course-info p { margin: 4px 0; font-size: 14px; }
.warning-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px; color: #92400e; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; margin-bottom: 4px; font-size: 13px; font-weight: 500; color: #374151; }
.form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical; }

.result-success { background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center; color: #166534; font-weight: 600; font-size: 15px; }
.result-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; text-align: center; color: #dc2626; font-weight: 600; font-size: 15px; }

/* Buttons */
.btn-primary { background: #7c3aed; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; }
.btn-primary:hover { background: #6d28d9; }
.btn-secondary { background: white; color: #374151; border: 1px solid #d1d5db; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; }
.btn-secondary:hover { background: #f9fafb; }
.btn-danger { background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.btn-danger:hover { background: #dc2626; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-cancel { background: white; color: #374151; border: 1px solid #d1d5db; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; }
.btn-cancel:hover { background: #f9fafb; }
.btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.text-muted { color: #9ca3af; font-style: italic; }
</style>
