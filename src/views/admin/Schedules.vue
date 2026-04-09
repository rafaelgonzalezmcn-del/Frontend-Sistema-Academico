<template>
  <div class="schedules-view">
    <div class="page-header">
      <h2>Horarios</h2>
      <div class="header-actions">
        <button @click="viewMode = viewMode === 'grid' ? 'list' : 'grid'" class="btn-secondary btn-sm">
          {{ viewMode === 'grid' ? '☰ Ver Lista' : '▦ Ver Cuadrícula' }}
        </button>
        <button @click="openModal()" class="btn-primary">+ Nuevo Horario</button>
      </div>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
      <button @click="fetchData" class="btn-retry">Reintentar</button>
    </div>

    <div v-else-if="loading" class="loading">Cargando horarios...</div>

    <!-- ═══════════ VISTA CUADRÍCULA (principal) ═══════════ -->
    <div v-else-if="viewMode === 'grid'" class="grid-view">
      <!-- Filtros -->
      <div class="filters-bar">
        <div class="filter-group">
          <label>Año Lectivo</label>
          <select v-model="selectedYearId" @change="onYearChange">
            <option :value="null">Todos</option>
            <option v-for="year in schoolYears" :key="year.id" :value="year.id">{{ year.name }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Grado</label>
          <select v-model="selectedGradeId" @change="onGradeChange">
            <option :value="null">Todos</option>
            <option v-for="grade in filteredGrades" :key="grade.id" :value="grade.id">{{ grade.name }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Sección</label>
          <select v-model="selectedSectionId">
            <option :value="null">— Selecciona una sección —</option>
            <option v-for="section in filteredSections" :key="section.id" :value="section.id">
              {{ section.grade?.name }} — {{ section.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Cuadrícula de la sección seleccionada -->
      <div v-if="selectedSectionId" class="schedule-grid-container">
        <div class="grid-title-bar">
          <h3 class="grid-title">
            {{ currentSectionLabel }}
          </h3>
          <span class="schedule-count">{{ currentSectionSchedules.length }} horario{{ currentSectionSchedules.length !== 1 ? 's' : '' }}</span>
        </div>

        <!-- Estado vacío -->
        <div v-if="currentSectionSchedules.length === 0" class="empty-state">
          <div class="empty-icon">📅</div>
          <p>No hay horarios para esta sección</p>
          <button @click="openModalForSection(selectedSectionId)" class="btn-primary btn-sm">+ Crear primer horario</button>
        </div>

        <!-- Cuadrícula -->
        <div v-else class="schedule-grid">
          <div class="grid-header">
            <div class="time-header">Hora</div>
            <div v-for="day in weekDays" :key="day" class="day-header">{{ day }}</div>
          </div>
          <div class="grid-body">
            <div v-for="hour in gridHours" :key="hour" class="grid-row">
              <div class="time-cell">{{ hour }}</div>
              <div
                v-for="day in weekDays"
                :key="day"
                class="schedule-cell"
                :class="{ 'has-schedule': getScheduleForCell(day, hour) }"
                @click="onCellClick(day, hour)"
              >
                <div v-if="getScheduleForCell(day, hour)" class="schedule-content">
                  <div class="subject-name">{{ getScheduleForCell(day, hour).subject }}</div>
                  <div class="teacher-name">{{ getScheduleForCell(day, hour).teacher }}</div>
                  <div class="time-badge">{{ getScheduleForCell(day, hour).timeRange }}</div>
                </div>
                <div v-else class="empty-cell">
                  <span class="plus-icon">+</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Leyenda -->
        <div v-if="currentSectionSchedules.length > 0" class="grid-legend">
          <span class="legend-item">
            <span class="legend-color occupied"></span> Ocupado (clic para editar)
          </span>
          <span class="legend-item">
            <span class="legend-color free"></span> Libre (clic para crear)
          </span>
        </div>
      </div>

      <!-- Sin sección seleccionada -->
      <div v-else class="no-section-selected">
        <div class="empty-icon">👆</div>
        <p>Selecciona una sección para ver su horario semanal</p>
      </div>
    </div>

    <!-- ═══════════ VISTA LISTA (alternativa) ═══════════ -->
    <div v-else class="list-view">
      <div class="schedules-hierarchy">
        <div v-for="yearData in groupedSchedules" :key="yearData.year.id" class="year-section">
          <h3 class="year-title">{{ yearData.year.name }}</h3>
          <div v-for="gradeData in yearData.grades" :key="gradeData.grade.id" class="grade-section">
            <h4 class="grade-title">{{ gradeData.grade.name }}</h4>
            <div v-for="sectionData in gradeData.sections" :key="sectionData.section.id" class="section-section">
              <h5 class="section-title">{{ sectionData.section.name }}</h5>
              <div class="section-schedules-table">
                <table v-if="sectionData.schedules.length > 0" class="data-table">
                  <thead>
                    <tr>
                      <th>Profesor</th>
                      <th>Materia</th>
                      <th>Día</th>
                      <th>Hora</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="schedule in sectionData.schedules" :key="schedule.id">
                      <td>{{ getTeacherName(schedule.teacher_id) }}</td>
                      <td>{{ getSubjectName(schedule.subject_id) }}</td>
                      <td>{{ schedule.day }}</td>
                      <td>{{ formatTime(schedule.start_time) }} - {{ formatTime(schedule.end_time) }}</td>
                      <td>
                        <button @click="openModal(schedule)" class="btn-primary btn-sm">Editar</button>
                        <button @click="deleteItem(schedule.id)" class="btn-danger btn-sm">Eliminar</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="no-schedules">No hay horarios para esta sección</div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="groupedSchedules.length === 0" class="no-data">No hay horarios registrados.</div>
      </div>
    </div>

    <!-- ═══════════ MODAL ═══════════ -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingItem ? 'Editar' : 'Nuevo' }} Horario</h3>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="saveItem" class="modal-body">
          <div class="form-group">
            <label>Profesor *</label>
            <select v-model="form.teacher_id" required>
              <option value="">Seleccionar profesor</option>
              <option v-for="teacher in teachers" :key="teacher.id" :value="teacher.id">
                {{ teacher.first_name }} {{ teacher.last_name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Materia *</label>
            <select v-model="form.subject_id" required>
              <option value="">Seleccionar materia</option>
              <option v-for="subject in subjects" :key="subject.id" :value="subject.id">{{ subject.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Sección *</label>
            <select v-model="form.section_id" required>
              <option value="">Seleccionar sección</option>
              <option v-for="section in filteredSections" :key="section.id" :value="section.id">
                {{ section.grade?.name }} — {{ section.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Día *</label>
            <select v-model="form.day" required>
              <option value="">Seleccionar día</option>
              <option v-for="day in weekDays" :key="day" :value="day">{{ day }}</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Hora Inicio *</label>
              <input v-model="form.start_time" type="time" required />
            </div>
            <div class="form-group">
              <label>Hora Fin *</label>
              <input v-model="form.end_time" type="time" required />
            </div>
          </div>
          <div v-if="saveError" class="form-error">{{ saveError }}</div>
          <div class="modal-footer">
            <button type="button" @click="closeModal" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { apiNormalized as api } from '../../services/apiNormalized';

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════
const SCHEDULE_HOURS = { START: 6, END: 18 };

const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
const viewMode = ref('grid');
const schedules = ref([]);
const teachers = ref([]);
const subjects = ref([]);
const sections = ref([]);
const schoolYears = ref([]);
const grades = ref([]);
const selectedYearId = ref(null);
const selectedGradeId = ref(null);
const selectedSectionId = ref(null);
const loading = ref(true);
const error = ref('');
const showModal = ref(false);
const editingItem = ref(null);
const saveError = ref('');

const form = ref({
  teacher_id: '',
  subject_id: '',
  section_id: '',
  day: '',
  start_time: '',
  end_time: ''
});

// ═══════════════════════════════════════════
// DATA FETCHING
// ═══════════════════════════════════════════
const fetchData = async () => {
  loading.value = true;
  error.value = '';
  try {
    const results = await Promise.allSettled([
      api.get('/class-schedules'),
      api.get('/teachers'),
      api.get('/subjects'),
      api.get('/sections'),
      api.get('/school-years?per_page=100'),
      api.get('/grades')
    ]);

    const [sRes, tRes, subRes, secRes, yrRes, grRes] = results.map(r => r.value);

    schedules.value = sRes?.data || [];
    teachers.value = tRes?.data || [];
    subjects.value = subRes?.data || [];
    sections.value = (secRes?.data || []).map(s => ({
      ...s,
      grade_name: s.grade?.name || '',
      year_name: s.schoolYear?.name || ''
    }));
    schoolYears.value = yrRes?.data || [];
    grades.value = grRes?.data || [];
  } catch (e) {
    console.error('Error loading schedules data', e);
    error.value = 'Error al cargar horarios';
  } finally {
    loading.value = false;
  }
};

// ═══════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════
const filteredGrades = computed(() => {
  if (!selectedYearId.value) return grades.value;
  const sectionGradeIds = sections.value
    .filter(s => s.school_year_id === selectedYearId.value)
    .map(s => s.grade_id);
  return grades.value.filter(g => sectionGradeIds.includes(g.id));
});

const filteredSections = computed(() => {
  let result = sections.value;
  if (selectedYearId.value) {
    result = result.filter(s => s.school_year_id === selectedYearId.value);
  }
  if (selectedGradeId.value) {
    result = result.filter(s => s.grade_id === selectedGradeId.value);
  }
  return result;
});

const onYearChange = () => {
  selectedGradeId.value = null;
  if (!filteredSections.value.some(s => s.id === selectedSectionId.value)) {
    selectedSectionId.value = null;
  }
};

const onGradeChange = () => {
  if (!filteredSections.value.some(s => s.id === selectedSectionId.value)) {
    selectedSectionId.value = null;
  }
};

// ═══════════════════════════════════════════
// GRID COMPUTED
// ═══════════════════════════════════════════
const currentSectionSchedules = computed(() => {
  if (!selectedSectionId.value) return [];
  return schedules.value.filter(s => s.section_id === selectedSectionId.value);
});

const currentSectionLabel = computed(() => {
  const section = sections.value.find(s => s.id === selectedSectionId.value);
  if (!section) return '';
  const grade = grades.value.find(g => g.id === section.grade_id);
  const year = schoolYears.value.find(y => y.id === section.school_year_id);
  const parts = [];
  if (grade) parts.push(grade.name);
  parts.push(`Sección ${section.name}`);
  if (year) parts.push(`(${year.name})`);
  return parts.join(' — ');
});

const gridHours = computed(() => {
  if (currentSectionSchedules.value.length === 0) {
    const hours = [];
    for (let h = SCHEDULE_HOURS.START; h < SCHEDULE_HOURS.END; h++) {
      hours.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return hours;
  }

  // Calculate dynamic range from actual schedules
  let minHour = 23;
  let maxHour = 0;
  currentSectionSchedules.value.forEach(s => {
    const startH = parseInt(formatTime(s.start_time).split(':')[0]);
    const endH = parseInt(formatTime(s.end_time).split(':')[0]);
    if (startH < minHour) minHour = startH;
    if (endH > maxHour) maxHour = endH;
  });

  // Add 1 hour padding on each side
  minHour = Math.max(0, minHour - 1);
  maxHour = Math.min(23, maxHour + 1);

  const hours = [];
  for (let h = minHour; h <= maxHour; h++) {
    hours.push(`${h.toString().padStart(2, '0')}:00`);
  }
  return hours;
});

// ═══════════════════════════════════════════
// GRID HELPERS
// ═══════════════════════════════════════════
const formatTime = (time) => {
  if (!time) return '';
  if (typeof time === 'string') {
    const parts = time.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1] || '00'}`;
  }
  if (time.format) return time.format('HH:mm');
  return String(time);
};

const getScheduleForCell = (day, hour) => {
  const hourNum = parseInt(hour.split(':')[0]);

  const schedule = currentSectionSchedules.value.find(s => {
    if (s.day !== day) return false;
    const startH = parseInt(formatTime(s.start_time).split(':')[0]);
    const startM = parseInt(formatTime(s.start_time).split(':')[1] || '0');
    const endH = parseInt(formatTime(s.end_time).split(':')[0]);
    const endM = parseInt(formatTime(s.end_time).split(':')[1] || '0');
    const startDecimal = startH + startM / 60;
    const endDecimal = endH + endM / 60;

    return hourNum >= startDecimal && hourNum < endDecimal;
  });

  if (!schedule) return null;

  return {
    id: schedule.id,
    subject: getSubjectName(schedule.subject_id),
    teacher: getTeacherName(schedule.teacher_id),
    timeRange: `${formatTime(schedule.start_time)}–${formatTime(schedule.end_time)}`,
    startHour: parseInt(formatTime(schedule.start_time).split(':')[0]),
    startMinute: parseInt(formatTime(schedule.start_time).split(':')[1] || '0'),
    endHour: parseInt(formatTime(schedule.end_time).split(':')[0]),
    endMinute: parseInt(formatTime(schedule.end_time).split(':')[1] || '0'),
    day: schedule.day,
    raw: schedule
  };
};

// ═══════════════════════════════════════════
// CELL INTERACTIONS
// ═══════════════════════════════════════════
const onCellClick = (day, hour) => {
  const existing = getScheduleForCell(day, hour);
  if (existing) {
    openModal(existing.raw);
  } else {
    openModalWithDayHour(day, hour);
  }
};

const openModalWithDayHour = (day, hour) => {
  const hourNum = parseInt(hour.split(':')[0]);
  // Default 1-hour slot starting at the clicked hour
  form.value = {
    teacher_id: '',
    subject_id: '',
    section_id: selectedSectionId.value || '',
    day: day,
    start_time: `${hourNum.toString().padStart(2, '0')}:00`,
    end_time: `${(hourNum + 1).toString().padStart(2, '0')}:00`
  };
  editingItem.value = null;
  saveError.value = '';
  showModal.value = true;
};

const openModalForSection = (sectionId) => {
  form.value = {
    teacher_id: '',
    subject_id: '',
    section_id: sectionId,
    day: '',
    start_time: '',
    end_time: ''
  };
  editingItem.value = null;
  saveError.value = '';
  showModal.value = true;
};

// ═══════════════════════════════════════════
// HIERARCHICAL GROUPING (for list view)
// ═══════════════════════════════════════════
const groupedSchedules = computed(() => {
  const gradesMap = {};
  grades.value.forEach(g => gradesMap[g.id] = g);
  const yearsMap = {};
  schoolYears.value.forEach(y => yearsMap[y.id] = y);
  const result = {};

  sections.value.forEach(section => {
    const grade = gradesMap[section.grade_id];
    const year = yearsMap[section.school_year_id];
    if (!year || !grade) return;
    const yk = year.id, gk = grade.id, sk = section.id;
    if (!result[yk]) result[yk] = { year, grades: {} };
    if (!result[yk].grades[gk]) result[yk].grades[gk] = { grade, sections: {} };
    if (!result[yk].grades[gk].sections[sk]) result[yk].grades[gk].sections[sk] = { section, schedules: [] };
  });

  schedules.value.forEach(schedule => {
    const section = sections.value.find(s => s.id === schedule.section_id);
    if (!section) return;
    const grade = gradesMap[section.grade_id];
    const year = yearsMap[schedule.school_year_id] || yearsMap[section.school_year_id];
    if (!year || !grade) return;
    const yk = year.id, gk = grade.id, sk = section.id;
    if (result[yk]?.grades[gk]?.sections[sk]) {
      result[yk].grades[gk].sections[sk].schedules.push(schedule);
    }
  });

  return Object.values(result).map(yd => ({
    ...yd,
    grades: Object.values(yd.grades).map(gd => ({
      ...gd,
      sections: Object.values(gd.sections)
    }))
  }));
});

// ═══════════════════════════════════════════
// LOOKUP HELPERS
// ═══════════════════════════════════════════
const getTeacherName = (id) => {
  const t = teachers.value.find(x => x.id === id);
  return t ? `${t.first_name} ${t.last_name}` : '-';
};

const getSubjectName = (id) => {
  const s = subjects.value.find(x => x.id === id);
  return s?.name || '-';
};

// ═══════════════════════════════════════════
// MODAL CRUD
// ═══════════════════════════════════════════
const openModal = (item = null) => {
  saveError.value = '';
  editingItem.value = item;
  if (item) {
    form.value = {
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      section_id: item.section_id,
      day: item.day,
      start_time: formatTime(item.start_time),
      end_time: formatTime(item.end_time)
    };
  } else {
    form.value = {
      teacher_id: '',
      subject_id: '',
      section_id: selectedSectionId.value || '',
      day: '',
      start_time: '',
      end_time: ''
    };
  }
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingItem.value = null;
  saveError.value = '';
};

const saveItem = async () => {
  saveError.value = '';
  try {
    const data = { ...form.value };
    if (editingItem.value) {
      await api.put(`/class-schedules/${editingItem.value.id}`, data);
    } else {
      await api.post('/class-schedules', data);
    }
    await fetchData();
    closeModal();
  } catch (e) {
    if (e.response?.data?.message) {
      saveError.value = e.response.data.message;
    } else if (e.response?.data?.errors) {
      saveError.value = Object.values(e.response.data.errors).flat().join(', ');
    } else {
      saveError.value = 'Error al guardar el horario';
    }
  }
};

const deleteItem = async (id) => {
  if (!confirm('¿Eliminar este horario?')) return;
  try {
    await api.delete(`/class-schedules/${id}`);
    await fetchData();
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al eliminar';
  }
};

// ═══════════════════════════════════════════
// LIFECYCLE
// ═══════════════════════════════════════════
onMounted(fetchData);
</script>

<style scoped>
/* ═══════════════════════════════════════════
   BASE
   ═══════════════════════════════════════════ */
.schedules-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: #111827;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #6b7280;
  font-size: 16px;
}

.btn-retry {
  padding: 6px 14px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

/* ═══════════════════════════════════════════
   FILTERS BAR
   ═══════════════════════════════════════════ */
.filters-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 180px;
}

.filter-group label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  color: #111827;
}

/* ═══════════════════════════════════════════
   GRID VIEW
   ═══════════════════════════════════════════ */
.grid-view {
  display: flex;
  flex-direction: column;
}

.schedule-grid-container {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.grid-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.grid-title {
  margin: 0;
  font-size: 16px;
  color: #111827;
}

.schedule-count {
  font-size: 13px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 3px 10px;
  border-radius: 12px;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  color: #6b7280;
  font-size: 15px;
  margin-bottom: 16px;
}

.no-section-selected {
  text-align: center;
  padding: 80px 20px;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
}

.no-section-selected .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.no-section-selected p {
  color: #6b7280;
  font-size: 15px;
}

/* ═══════════════════════════════════════════
   SCHEDULE GRID
   ═══════════════════════════════════════════ */
.schedule-grid {
  display: flex;
  flex-direction: column;
}

.grid-header {
  display: grid;
  grid-template-columns: 80px repeat(6, 1fr);
  background: #1f2937;
  color: white;
}

.time-header, .day-header {
  padding: 10px 8px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
}

.time-header {
  background: #111827;
}

.grid-body {
  display: flex;
  flex-direction: column;
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
  padding: 8px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #e5e7eb;
}

.schedule-cell {
  min-height: 56px;
  padding: 4px;
  cursor: pointer;
  transition: background 0.15s ease;
  border-right: 1px solid #f3f4f6;
}

.schedule-cell:last-child {
  border-right: none;
}

.schedule-cell:hover {
  background: #f0f9ff;
}

.schedule-cell.has-schedule:hover {
  background: #fef3c7;
}

.schedule-content {
  background: #dbeafe;
  border: 1px solid #93c5fd;
  border-radius: 6px;
  padding: 6px 8px;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.subject-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e40af;
  line-height: 1.3;
}

.teacher-name {
  font-size: 11px;
  color: #3b82f6;
  margin-top: 2px;
}

.time-badge {
  font-size: 10px;
  color: #60a5fa;
  margin-top: 2px;
  font-weight: 500;
}

.empty-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
}

.plus-icon {
  font-size: 18px;
  color: #d1d5db;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.schedule-cell:hover .plus-icon {
  opacity: 1;
}

/* Legend */
.grid-legend {
  display: flex;
  gap: 20px;
  padding: 12px 20px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.legend-color {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid;
}

.legend-color.occupied {
  background: #dbeafe;
  border-color: #93c5fd;
}

.legend-color.free {
  background: white;
  border-color: #d1d5db;
}

/* ═══════════════════════════════════════════
   LIST VIEW
   ═══════════════════════════════════════════ */
.list-view .schedules-hierarchy {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.year-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px;
}

.year-title {
  margin: 0 0 12px;
  font-size: 18px;
  color: #111827;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.grade-section {
  margin-left: 16px;
  margin-bottom: 12px;
}

.grade-title {
  margin: 0 0 8px;
  font-size: 15px;
  color: #374151;
}

.section-section {
  margin-left: 16px;
  margin-bottom: 8px;
}

.section-title {
  margin: 0 0 6px;
  font-size: 14px;
  color: #6b7280;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  background: #f9fafb;
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

.data-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
  color: #4b5563;
}

.data-table tr:hover td {
  background: #f9fafb;
}

.no-schedules {
  padding: 12px;
  color: #9ca3af;
  font-style: italic;
  font-size: 13px;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
  font-size: 15px;
}

/* ═══════════════════════════════════════════
   BUTTONS
   ═══════════════════════════════════════════ */
.btn-primary {
  background: #7c3aed;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-primary:hover {
  background: #6d28d9;
}

.btn-primary.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-secondary:hover {
  background: #f9fafb;
}

.btn-secondary.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-cancel {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-cancel:hover {
  background: #f9fafb;
}

/* ═══════════════════════════════════════════
   MODAL
   ═══════════════════════════════════════════ */
.modal-overlay {
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

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  line-height: 1;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group select,
.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

/* ═══════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════ */
@media (max-width: 768px) {
  .filters-bar {
    flex-direction: column;
  }

  .grid-header, .grid-row {
    grid-template-columns: 60px repeat(6, minmax(100px, 1fr));
  }

  .schedule-grid-wrapper {
    overflow-x: auto;
  }
}
</style>
