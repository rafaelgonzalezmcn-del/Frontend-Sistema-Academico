<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { apiNormalized as api } from '../../services/apiNormalized';

const router = useRouter();

// ═══════════════════════════════════════════
// STEPS
// ═══════════════════════════════════════════
const currentStep = ref(1);
const totalSteps = 2;

// ═══════════════════════════════════════════
// MODE
// ═══════════════════════════════════════════
const isNewStudent = ref(true);

// ═══════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════
const schoolYears = ref([]);
const grades = ref([]);
const sections = ref([]);
const existingStudents = ref([]);

const selectedYearId = ref(null);
const selectedGradeId = ref(null);
const selectedSectionId = ref(null);
const selectedStudentId = ref(null);

const loading = ref(true);
const submitting = ref(false);
const error = ref('');

// ═══════════════════════════════════════════
// FORM — NEW STUDENT
// ═══════════════════════════════════════════
const studentForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  identification_number: '',
  phone: '',
});

// ═══════════════════════════════════════════
// FORM — EXISTING STUDENT
// ═══════════════════════════════════════════
const searchQuery = ref('');
const searchLoading = ref(false);
const searchResults = ref([]);
const existingEnrollment = ref(null);

// ═══════════════════════════════════════════
// LOAD DATA
// ═══════════════════════════════════════════
const loadData = async () => {
  loading.value = true;
  try {
    const [yearsRes, gradesRes, sectionsRes] = await Promise.all([
      api.get('/school-years?per_page=100'),
      api.get('/grades'),
      api.get('/admin/enrollments/available-sections'),
    ]);

    schoolYears.value = yearsRes?.data || [];
    grades.value = gradesRes?.data || [];
    sections.value = sectionsRes?.data || [];

    // Auto-select active year
    const active = schoolYears.value.find(y => y.active);
    if (active) selectedYearId.value = active.id;
  } catch (e) {
    console.error('Error loading enrollment data:', e);
    error.value = 'Error al cargar datos para la matrícula';
  } finally {
    loading.value = false;
  }
};

// ═══════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════
const filteredGrades = computed(() => {
  if (!selectedYearId.value) return grades.value;
  const gradeIds = [...new Set(
    sections.value
      .filter(s => s.school_year_id === selectedYearId.value)
      .map(s => s.grade_id)
  )];
  return grades.value.filter(g => gradeIds.includes(g.id));
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
  selectedSectionId.value = null;
};

const onGradeChange = () => {
  selectedSectionId.value = null;
};

// ═══════════════════════════════════════════
// SEARCH EXISTING STUDENT
// ═══════════════════════════════════════════
let searchTimeout = null;

watch(searchQuery, (val) => {
  clearTimeout(searchTimeout);
  if (!val || val.length < 2) {
    searchResults.value = [];
    return;
  }
  searchTimeout = setTimeout(async () => {
    searchLoading.value = true;
    try {
      const res = await api.get(`/users?role=estudiante&search=${encodeURIComponent(val)}&page=1`);
      searchResults.value = res?.data || [];
    } catch (e) {
      console.error('Error searching students:', e);
      searchResults.value = [];
    } finally {
      searchLoading.value = false;
    }
  }, 400);
});

const selectExistingStudent = async (student) => {
  selectedStudentId.value = student.id;
  searchResults.value = [];
  searchQuery.value = `${student.first_name} ${student.last_name || ''}`.trim();

  // Check existing enrollment
  try {
    const res = await api.get(`/admin/enrollments/check-student/${student.id}`);
    existingEnrollment.value = res?.data?.current_enrollment || null;
  } catch (e) {
    existingEnrollment.value = null;
  }
};

// ═══════════════════════════════════════════
// STEP NAVIGATION
// ═══════════════════════════════════════════
const canProceedStep1 = computed(() => {
  if (isNewStudent.value) {
    return studentForm.value.first_name.trim() !== '';
  } else {
    return selectedStudentId.value !== null;
  }
});

const canProceedStep2 = computed(() => {
  return selectedSectionId.value !== null;
});

const goToStep = (step) => {
  if (step === 2 && !canProceedStep1.value) return;
  currentStep.value = step;
  error.value = '';
};

// ═══════════════════════════════════════════
// SUBMIT
// ═══════════════════════════════════════════
const submitEnrollment = async () => {
  if (!canProceedStep2.value) return;

  submitting.value = true;
  error.value = '';

  try {
    const payload = {
      section_id: selectedSectionId.value,
    };

    if (isNewStudent.value) {
      // Flat structure matching backend validation
      Object.assign(payload, studentForm.value);
    } else {
      payload.student_id = selectedStudentId.value;
    }

    await api.post('/admin/enrollments', payload);
    router.push({ path: '/admin/usuarios', query: { role: 'estudiante' } });
  } catch (e) {
    if (e.response?.data?.message) {
      error.value = e.response.data.message;
    } else {
      error.value = 'Error al matricular el estudiante';
    }
  } finally {
    submitting.value = false;
  }
};

// ═══════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════
const summaryStudent = computed(() => {
  if (isNewStudent.value) {
    const name = [studentForm.value.first_name, studentForm.value.last_name].filter(Boolean).join(' ');
    return {
      name: name || '(sin nombre completo)',
      cedula: studentForm.value.identification_number || '—',
      email: studentForm.value.email || '—',
      phone: studentForm.value.phone || '—',
      isNew: true,
    };
  } else {
    const student = searchResults.value.find(s => s.id === selectedStudentId.value);
    const existing = existingEnrollment.value;
    return {
      name: searchQuery.value || 'Estudiante seleccionado',
      cedula: student?.identification_number || '—',
      email: student?.email || '—',
      currentSection: existing ? `${existing.grade} — ${existing.section}` : 'Sin sección',
      currentYear: existing?.school_year || '—',
      currentGradeId: student?.section?.grade_id || null,
      currentSchoolYearId: student?.section?.school_year_id || null,
      isNew: false,
    };
  }
});

const summarySection = computed(() => {
  const section = sections.value.find(s => s.id === selectedSectionId.value);
  if (!section) return null;
  return {
    label: section.label,
    enrolled: section.enrolled,
    available: section.available,
    maxCapacity: section.max_capacity,
    gradeId: section.grade_id,
    schoolYearId: section.school_year_id,
    gradeName: section.grade_name,
    schoolYearName: section.school_year_name,
  };
});

// Detectar si el cambio es válido (mismo grado/año) o intentaría saltar reglas
const moveTypeLabel = computed(() => {
  if (isNewStudent.value) return null;
  if (!summarySection.value) return null;
  const current = summaryStudent.value;
  const dest = summarySection.value;
  if (!current.currentGradeId) return 'Primera matrícula';

  const sameGrade = current.currentGradeId === dest.gradeId;
  const sameYear = current.currentSchoolYearId === dest.schoolYearId;

  if (sameGrade && sameYear) return { type: 'parallel', label: 'Cambio de paralelo', valid: true };
  if (!sameGrade) return { type: 'grade_change', label: 'Cambio de grado — use Promociones', valid: false };
  if (!sameYear) return { type: 'year_change', label: 'Cambio de año lectivo — use Promociones', valid: false };
  return null;
});

const showPassword = ref(false);

// ═══════════════════════════════════════════
// LIFECYCLE
// ═══════════════════════════════════════════
onMounted(loadData);
</script>

<template>
  <div class="enrollment-wizard">
    <div class="page-header">
      <div>
        <h2>Matricular Estudiante</h2>
        <p class="subtitle">Asistente guiado para inscribir un estudiante en una sección</p>
      </div>
      <button @click="router.push('/admin/usuarios')" class="btn-cancel">← Volver</button>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-message">
      <span>⚠️</span>
      <span>{{ error }}</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">Cargando datos...</div>

    <div v-else class="wizard-container">
      <!-- Step indicators -->
      <div class="step-indicators">
        <div
          v-for="step in totalSteps"
          :key="step"
          class="step-item"
          :class="{ active: currentStep >= step, completed: currentStep > step }"
          @click="goToStep(step)"
        >
          <div class="step-number">{{ step }}</div>
          <div class="step-label">
            {{ step === 1 ? 'Estudiante' : 'Sección y Confirmar' }}
          </div>
        </div>
        <div v-for="i in totalSteps - 1" :key="`arrow-${i}`" class="step-arrow">→</div>
      </div>

      <!-- ═══════ STEP 1: Student ═══════ -->
      <div v-if="currentStep === 1" class="step-content">
        <!-- Mode toggle -->
        <div class="mode-toggle">
          <button
            :class="{ active: isNewStudent }"
            @click="isNewStudent = true; selectedStudentId = null; existingEnrollment = null; searchQuery = ''"
          >
            🆕 Estudiante Nuevo
          </button>
          <button
            :class="{ active: !isNewStudent }"
            @click="isNewStudent = false; studentForm = { first_name: '', last_name: '', email: '', password: '', identification_number: '', phone: '' }"
          >
            🔍 Estudiante Existente
          </button>
        </div>

        <!-- NEW STUDENT FORM -->
        <div v-if="isNewStudent" class="form-card">
          <h3>Datos del Estudiante</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Nombre *</label>
              <input v-model="studentForm.first_name" type="text" placeholder="Ej: Carlos" required />
            </div>
            <div class="form-group">
              <label>Apellido</label>
              <input v-model="studentForm.last_name" type="text" placeholder="Ej: Ramírez" />
            </div>
            <div class="form-group">
              <label>Cédula</label>
              <input v-model="studentForm.identification_number" type="text" placeholder="Ej: 1723456789" />
            </div>
            <div class="form-group">
              <label>Teléfono</label>
              <input v-model="studentForm.phone" type="text" placeholder="Ej: 0987654321" />
            </div>
            <div class="form-group">
              <label>Correo Electrónico *</label>
              <input v-model="studentForm.email" type="email" placeholder="Ej: carlos@email.com" required />
            </div>
            <div class="form-group">
              <label>Contraseña *</label>
              <div class="password-input-wrapper">
                <input v-model="studentForm.password" :type="showPassword ? 'text' : 'password'" placeholder="Mínimo 8 caracteres" required />
                <button type="button" class="password-toggle" @click="showPassword = !showPassword">
                  {{ showPassword ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- EXISTING STUDENT SEARCH -->
        <div v-else class="search-card">
          <h3>Buscar Estudiante Existente</h3>
          <div class="search-input-wrapper">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por nombre, cédula o correo..."
              class="search-input"
            />
            <span v-if="searchLoading" class="search-spinner">⏳</span>
          </div>

          <!-- Existing enrollment warning -->
          <div v-if="existingEnrollment" class="enrollment-warning">
            <span>⚠️</span>
            <div>
              <strong>Estudiante ya matriculado</strong>
              <p>Actualmente está en: {{ existingEnrollment.grade }} — {{ existingEnrollment.section }} ({{ existingEnrollment.school_year }})</p>
              <small>Al continuar, se moverá a la nueva sección seleccionada en el paso 2.</small>
            </div>
          </div>

          <!-- Search results -->
          <div v-if="searchResults.length > 0" class="search-results">
            <div
              v-for="student in searchResults"
              :key="student.id"
              class="search-result-item"
              :class="{ selected: selectedStudentId === student.id }"
              @click="selectExistingStudent(student)"
            >
              <div class="result-name">{{ student.first_name }} {{ student.last_name || '' }}</div>
              <div class="result-meta">
                <span v-if="student.identification_number">Cédula: {{ student.identification_number }}</span>
                <span v-if="student.email">| {{ student.email }}</span>
                <span v-if="student.section">| {{ student.section?.grade?.name }} — {{ student.section?.name }}</span>
              </div>
            </div>
          </div>

          <div v-else-if="searchQuery.length >= 2 && !searchLoading" class="no-results">
            No se encontraron estudiantes con ese criterio
          </div>
        </div>

        <!-- Step 1 navigation -->
        <div class="step-nav">
          <div></div>
          <button
            @click="goToStep(2)"
            :disabled="!canProceedStep1"
            class="btn-primary"
          >
            Siguiente →
          </button>
        </div>
      </div>

      <!-- ═══════ STEP 2: Section + Confirm ═══════ -->
      <div v-if="currentStep === 2" class="step-content">
        <!-- Section selection -->
        <div class="form-card">
          <h3>Seleccionar Sección</h3>

          <div class="filters-row">
            <div class="form-group">
              <label>Año Lectivo</label>
              <select v-model="selectedYearId" @change="onYearChange">
                <option :value="null">Todos</option>
                <option v-for="year in schoolYears" :key="year.id" :value="year.id">
                  {{ year.name }}{{ year.active ? ' (Activo)' : '' }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Grado</label>
              <select v-model="selectedGradeId" @change="onGradeChange">
                <option :value="null">Todos</option>
                <option v-for="grade in filteredGrades" :key="grade.id" :value="grade.id">{{ grade.name }}</option>
              </select>
            </div>
          </div>

          <!-- Section cards -->
          <div class="section-cards">
            <div
              v-for="section in filteredSections"
              :key="section.id"
              class="section-card"
              :class="{
                selected: selectedSectionId === section.id,
                full: section.is_full
              }"
              @click="!section.is_full && (selectedSectionId = section.id)"
            >
              <div class="section-info">
                <div class="section-name">{{ section.label }}</div>
                <div class="section-capacity">
                  <span v-if="section.max_capacity">
                    {{ section.enrolled }}/{{ section.max_capacity }} estudiantes
                    <span v-if="section.available > 0" class="capacity-available">
                      ({{ section.available }} disponibles)
                    </span>
                  </span>
                  <span v-else class="capacity-unlimited">♾️ Sin límite</span>
                </div>
              </div>
              <div v-if="section.is_full" class="full-badge">Llena</div>
              <div v-else-if="selectedSectionId === section.id" class="selected-badge">✓</div>
            </div>
          </div>

          <div v-if="filteredSections.length === 0" class="no-sections">
            No hay secciones disponibles con los filtros seleccionados
          </div>
        </div>

        <!-- Summary -->
        <div v-if="selectedSectionId" class="summary-card">
          <h3>📋 Resumen de Matrícula</h3>

          <div class="summary-grid">
            <!-- Current state -->
            <div class="summary-section">
              <h4>{{ summaryStudent.isNew ? '🆕 Estudiante Nuevo' : '📍 Estado Actual' }}</h4>
              <div class="summary-row">
                <span>Nombre:</span>
                <strong>{{ summaryStudent.name }}</strong>
              </div>
              <div class="summary-row">
                <span>Cédula:</span>
                <span>{{ summaryStudent.cedula }}</span>
              </div>
              <div class="summary-row">
                <span>Email:</span>
                <span>{{ summaryStudent.email }}</span>
              </div>
              <div v-if="summaryStudent.phone" class="summary-row">
                <span>Teléfono:</span>
                <span>{{ summaryStudent.phone }}</span>
              </div>
              <div v-if="!summaryStudent.isNew" class="summary-row">
                <span>Sección actual:</span>
                <span>{{ summaryStudent.currentSection }}</span>
              </div>
              <div v-if="!summaryStudent.isNew" class="summary-row">
                <span>Año actual:</span>
                <span>{{ summaryStudent.currentYear }}</span>
              </div>
            </div>

            <!-- Destination state -->
            <div class="summary-section">
              <h4>🎯 Sección de Destino</h4>
              <div class="summary-row">
                <span>Sección:</span>
                <strong>{{ summarySection.label }}</strong>
              </div>
              <div class="summary-row">
                <span>Cupo:</span>
                <span v-if="summarySection.maxCapacity">
                  {{ summarySection.enrolled }}/{{ summarySection.maxCapacity }}
                  ({{ summarySection.available }} disponibles)
                </span>
                <span v-else>Sin límite</span>
              </div>
              <!-- Move type indicator -->
              <div v-if="moveTypeLabel" class="move-type-indicator" :class="moveTypeLabel.valid ? 'valid' : 'invalid'">
                <span class="move-type-icon">{{ moveTypeLabel.valid ? '✅' : '⚠️' }}</span>
                <span class="move-type-text">{{ moveTypeLabel.label }}</span>
              </div>
            </div>
          </div>

          <div class="summary-actions">
            <button @click="goToStep(1)" class="btn-cancel" :disabled="submitting">← Volver</button>
            <button
              @click="submitEnrollment"
              class="btn-primary btn-lg"
              :disabled="submitting"
            >
              <span v-if="submitting">⏳ Matriculando...</span>
              <span v-else>✅ Confirmar Matrícula</span>
            </button>
          </div>
        </div>

        <!-- Step 2 navigation (without summary) -->
        <div v-if="!selectedSectionId" class="step-nav">
          <button @click="goToStep(1)" class="btn-cancel">← Volver</button>
          <div></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════
   BASE
   ═══════════════════════════════════════════ */
.enrollment-wizard {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 4px;
  font-size: 24px;
  color: #111827;
}

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
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
  gap: 8px;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

/* ═══════════════════════════════════════════
   STEP INDICATORS
   ═══════════════════════════════════════════ */
.step-indicators {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 32px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.2s;
}

.step-item.active {
  opacity: 1;
}

.step-item.completed {
  opacity: 0.7;
}

.step-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  transition: background 0.2s, color 0.2s;
}

.step-item.active .step-number {
  background: #7c3aed;
  color: white;
}

.step-item.completed .step-number {
  background: #22c55e;
  color: white;
}

.step-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.step-arrow {
  margin: 0 16px;
  color: #d1d5db;
  font-size: 18px;
}

/* ═══════════════════════════════════════════
   MODE TOGGLE
   ═══════════════════════════════════════════ */
.mode-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.mode-toggle button {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s;
}

.mode-toggle button.active {
  border-color: #7c3aed;
  background: #f5f3ff;
  color: #7c3aed;
}

.mode-toggle button:hover:not(.active) {
  border-color: #d1d5db;
  background: #f9fafb;
}

/* ═══════════════════════════════════════════
   FORM CARD
   ═══════════════════════════════════════════ */
.form-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
}

.form-card h3 {
  margin: 0 0 16px;
  font-size: 16px;
  color: #111827;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #111827;
}

.filters-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.password-input-wrapper {
  position: relative;
}

.password-input-wrapper input {
  width: 100%;
  padding-right: 40px;
}

.password-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  line-height: 1;
  opacity: 0.6;
  transition: opacity 0.15s;
}

.password-toggle:hover {
  opacity: 1;
}

/* ═══════════════════════════════════════════
   SEARCH
   ═══════════════════════════════════════════ */
.search-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
}

.search-card h3 {
  margin: 0 0 16px;
  font-size: 16px;
  color: #111827;
}

.search-input-wrapper {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.search-spinner {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.search-results {
  margin-top: 12px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.search-result-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.15s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: #f5f3ff;
}

.search-result-item.selected {
  background: #ede9fe;
  border-left: 3px solid #7c3aed;
}

.result-name {
  font-weight: 600;
  color: #111827;
  font-size: 14px;
}

.result-meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.no-results {
  text-align: center;
  padding: 20px;
  color: #9ca3af;
  font-size: 14px;
}

.enrollment-warning {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 12px;
  display: flex;
  gap: 10px;
  font-size: 13px;
  color: #92400e;
}

.enrollment-warning strong {
  display: block;
  margin-bottom: 4px;
}

.enrollment-warning p {
  margin: 4px 0;
}

.enrollment-warning small {
  color: #a16207;
}

/* ═══════════════════════════════════════════
   SECTION CARDS
   ═══════════════════════════════════════════ */
.section-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
  max-height: 350px;
  overflow-y: auto;
}

.section-card {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-card:hover:not(.full) {
  border-color: #c4b5fd;
  background: #faf5ff;
}

.section-card.selected {
  border-color: #7c3aed;
  background: #f5f3ff;
}

.section-card.full {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f9fafb;
}

.section-name {
  font-weight: 600;
  color: #111827;
  font-size: 14px;
}

.section-capacity {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.capacity-available {
  color: #16a34a;
  font-weight: 500;
}

.capacity-unlimited {
  color: #6b7280;
}

.full-badge {
  background: #ef4444;
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.selected-badge {
  background: #7c3aed;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.no-sections {
  text-align: center;
  padding: 20px;
  color: #9ca3af;
  font-size: 14px;
}

/* ═══════════════════════════════════════════
   SUMMARY
   ═══════════════════════════════════════════ */
.summary-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
}

.summary-card h3 {
  margin: 0 0 20px;
  font-size: 16px;
  color: #111827;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.summary-section h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}

.summary-row span:first-child {
  color: #6b7280;
}

.summary-tag {
  display: inline-block;
  margin-top: 12px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.summary-tag.new {
  background: #dbeafe;
  color: #1e40af;
}

.summary-tag.existing {
  background: #fef3c7;
  color: #92400e;
}

.move-type-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.move-type-indicator.valid {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.move-type-indicator.invalid {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.move-type-icon { font-size: 14px; }

.summary-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

/* ═══════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════ */
.step-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}

/* ═══════════════════════════════════════════
   BUTTONS
   ═══════════════════════════════════════════ */
.btn-primary {
  background: #7c3aed;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background: #6d28d9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary.btn-lg {
  padding: 12px 28px;
  font-size: 15px;
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

.btn-cancel:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ═══════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════ */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .section-cards {
    grid-template-columns: 1fr;
  }

  .filters-row {
    grid-template-columns: 1fr;
  }
}
</style>
