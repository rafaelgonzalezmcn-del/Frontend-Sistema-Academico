<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { apiNormalized as api } from '../../services/apiNormalized';

const router = useRouter();
const loading = ref(true);
const error = ref({ message: '', type: '' });
const sections = ref([]);
const students = ref([]);
const selectedYearId = ref('');
const selectedGradeId = ref('');
const selectedSection = ref('');
const targetGradeId = ref('');
const targetSectionId = ref('');
const targetSections = ref([]);
const targetSectionStudents = ref([]);
const loadingTargetStudents = ref(false);
const grades = ref([]);
const schoolYears = ref([]);
const moveType = ref('promote'); // 'promote' | 'repeat'
const promoting = ref(false);
const showConfirmModal = ref(false);
const showResultModal = ref(false);
const confirmTarget = ref(null);
const batchResult = ref(null);

// Años disponibles (solo los que tienen secciones)
const availableYears = computed(() => {
  const yearMap = new Map();
  sections.value.forEach(s => {
    if (s.school_year_id && !yearMap.has(s.school_year_id)) {
      const year = schoolYears.value.find(y => y.id === s.school_year_id);
      if (year) yearMap.set(year.id, year);
    }
  });
  return [...yearMap.values()].sort((a, b) => {
    if (a.grade_order != null && b.grade_order != null) return a.grade_order - b.grade_order;
    return new Date(a.start_date) - new Date(b.start_date);
  });
});

// Grados disponibles para el año seleccionado
const availableGrades = computed(() => {
  if (!selectedYearId.value) return [];
  const gradeIds = new Set(
    sections.value
      .filter(s => s.school_year_id === parseInt(selectedYearId.value))
      .map(s => s.grade_id)
  );
  return grades.value
    .filter(g => gradeIds.has(g.id) && g.grade_order !== null)
    .sort((a, b) => a.grade_order - b.grade_order);
});

// Secciones disponibles para el año + grado seleccionado
const availableSections = computed(() => {
  if (!selectedYearId.value || !selectedGradeId.value) return [];
  return sections.value.filter(s =>
    s.school_year_id === parseInt(selectedYearId.value) &&
    s.grade_id === parseInt(selectedGradeId.value)
  );
});

// Info de la sección seleccionada
const currentSectionInfo = computed(() => {
  if (!selectedSection.value) return null;
  return sections.value.find(s => s.id === parseInt(selectedSection.value)) || null;
});

// Año lectivo actual
const currentSchoolYear = computed(() => {
  if (!currentSectionInfo.value?.school_year_id) return null;
  return schoolYears.value.find(y => y.id === currentSectionInfo.value.school_year_id) || null;
});

// Año lectivo destino (siempre el siguiente al actual)
const targetSchoolYear = computed(() => {
  const current = currentSchoolYear.value;
  if (!current) return null;
  const currentIdx = schoolYears.value.findIndex(y => y.id === current.id);
  return currentIdx >= 0 && currentIdx < schoolYears.value.length - 1
    ? schoolYears.value[currentIdx + 1]
    : null;
});

// Grado destino según moveType
const expectedGradeId = computed(() => {
  const section = currentSectionInfo.value;
  if (!section?.grade_id) return null;
  if (moveType.value === 'promote') {
    const sorted = [...grades.value].filter(g => g.grade_order !== null).sort((a, b) => a.grade_order - b.grade_order);
    const idx = sorted.findIndex(g => g.id === section.grade_id);
    return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1].id : null;
  }
  return section.grade_id; // repeat = mismo grado
});

// Secciones destino filtradas por grado esperado Y año destino
const destSections = computed(() => {
  if (!expectedGradeId.value || !targetSchoolYear.value) return [];
  return sections.value.filter(s =>
    s.grade_id === expectedGradeId.value &&
    s.school_year_id === targetSchoolYear.value.id
  );
});

const targetSectionName = computed(() => {
  const section = destSections.value.find(s => s.id === parseInt(targetSectionId.value));
  return section ? `${section.grade?.name} - ${section.name}` : '';
});

// Cargar estudiantes de la sección destino seleccionada
const loadTargetSectionStudents = async () => {
  if (!targetSectionId.value) {
    targetSectionStudents.value = [];
    return;
  }
  loadingTargetStudents.value = true;
  try {
    const res = await api.get('/users', {
      params: { section_id: targetSectionId.value, role: 'estudiante', page: 1 }
    });
    targetSectionStudents.value = res.data?.data || res.data || [];
  } catch {
    targetSectionStudents.value = [];
  } finally {
    loadingTargetStudents.value = false;
  }
};

watch(targetSectionId, loadTargetSectionStudents);

// Cuando cambia el año, resetear grado y sección
watch(selectedYearId, () => {
  selectedGradeId.value = '';
  selectedSection.value = '';
  targetSectionId.value = '';
  students.value = [];
});

// Cuando cambia el grado, resetear sección
watch(selectedGradeId, () => {
  selectedSection.value = '';
  targetSectionId.value = '';
  students.value = [];
});

// Cuando cambia la sección, cargar estudiantes y secciones destino
watch(selectedSection, () => {
  loadStudents();
});

// Cuando cambia moveType, recargar secciones destino
watch(moveType, () => {
  targetSectionId.value = '';
  if (selectedSection.value) loadStudents();
});

const fetchData = async () => {
  loading.value = true;
  error.value = { message: '', type: '' };

  try {
    const [sectionsRes, gradesRes, yearsRes] = await Promise.all([
      // Traer TODAS las secciones (sin paginación)
      api.get('/sections?per_page=100'),
      api.get('/grades'),
      // Traer TODOS los años lectivos (sin paginación)
      api.get('/school-years?per_page=100'),
    ]);
    // api es axios raw → res.data = { data: [...], meta: {...} }
    sections.value = sectionsRes.data?.data || sectionsRes.data || [];
    grades.value = gradesRes.data?.data || gradesRes.data || [];
    const rawYears = yearsRes.data?.data || yearsRes.data || [];
    schoolYears.value = rawYears.sort((a, b) => {
      if (a.grade_order != null && b.grade_order != null) return a.grade_order - b.grade_order;
      if (a.grade_order != null) return -1;
      if (b.grade_order != null) return 1;
      return new Date(a.start_date) - new Date(b.start_date);
    });

    console.log('=== DEBUG fetchData ===');
    console.log('sections count:', sections.value.length);
    console.log('grades count:', grades.value.length);
    console.log('schoolYears count:', schoolYears.value.length);
    console.log('First 3 years:', schoolYears.value.slice(0, 3).map(y => ({ id: y.id, name: y.name, grade_order: y.grade_order })));
    console.log('Year with ID 1:', schoolYears.value.find(y => y.id === 1));
    console.log('Year with ID 38:', schoolYears.value.find(y => y.id === 38));
  } catch (e) {
    error.value = { message: 'Error al cargar datos', type: 'server' };
  } finally {
    loading.value = false;
  }
};

const loadStudents = async () => {
  if (!selectedSection.value) {
    students.value = [];
    targetSectionId.value = '';
    return;
  }

  try {
    const res = await api.get('/users', { params: { section_id: selectedSection.value, role: 'estudiante', page: 1 } });
    students.value = res.data?.data || res.data || [];

    // Cargar elegibilidad para todos los estudiantes de la sección
    if (students.value.length > 0) {
      try {
        const studentIds = students.value.map(s => s.id);
        const eligRes = await api.post('/admin/promotions/check-batch-eligibility', {
          student_ids: studentIds,
        });
        const eligibilityMap = eligRes.data || {};
        // Adjuntar elegibilidad a cada estudiante
        students.value = students.value.map(s => ({
          ...s,
          eligibility: eligibilityMap[s.id] || null,
        }));
      } catch {
        // Si falla la elegibilidad, mostrar estudiantes sin info de elegibilidad
        students.value = students.value.map(s => ({ ...s, eligibility: null }));
      }
    }

    targetSectionId.value = destSections.value.length > 0 ? destSections.value[0].id : '';
  } catch (e) {
    error.value = { message: 'Error al cargar estudiantes', type: 'server' };
  }
};

const openConfirm = (student) => {
  confirmTarget.value = student;
  batchResult.value = null;
  showConfirmModal.value = true;
};

const closeConfirm = () => {
  showConfirmModal.value = false;
  confirmTarget.value = null;
  batchResult.value = null;
};

const promoteStudent = async () => {
  if (!confirmTarget.value || !targetSectionId.value) return;

  promoting.value = true;
  try {
    const res = await api.post(`/admin/students/${confirmTarget.value.id}/promote`, {
      target_section_id: parseInt(targetSectionId.value),
      move_type: moveType.value,
    });

    // apiNormalized ya desenvuelve response.data.data
    // res.data = { success, student_name, move_type, ... }
    batchResult.value = {
      success: res.data?.success ? 1 : 0,
      skipped: 0,
      total: 1,
      errors: [],
      message: res.message || 'Promoción exitosa',
    };
    showResultModal.value = true;
    showConfirmModal.value = false;
    loadStudents();
  } catch (e) {
    const msg = e.response?.data?.message || e.response?.data?.errors
      ? Object.values(e.response.data.errors).flat().join(', ')
      : 'Error al promover';
    batchResult.value = {
      success: 0,
      skipped: 1,
      total: 1,
      errors: [msg],
    };
    showResultModal.value = true;
    showConfirmModal.value = false;
  } finally {
    promoting.value = false;
  }
};

const promoteAll = async () => {
  if (!selectedSection.value || !expectedGradeId.value) return;
  if (!confirm('¿Promover todos los estudiantes elegibles de esta sección?')) return;

  promoting.value = true;
  try {
    const res = await api.post(`/admin/sections/${selectedSection.value}/promote-all`, {
      target_grade_id: parseInt(expectedGradeId.value),
      move_type: moveType.value,
    });

    // apiNormalized ya desenvuelve. Pero con validateStatus=true, un 422 resuelve como éxito.
    // Verificar si la respuesta es un error (no tiene promoted/skipped)
    const result = res.data;

    if (!result || typeof result.promoted === 'undefined') {
      // Es un error 422 que se resolvió como éxito por validateStatus=true
      const errMsg = res.message || res.data?.message || 'Error en promoción masiva';
      const errDetails = res.data?.errors;
      const errors = errDetails
        ? (Array.isArray(errDetails) ? errDetails : Object.values(errDetails).flat())
        : [errMsg];

      batchResult.value = {
        success: 0,
        skipped: students.value.length,
        total: students.value.length,
        errors,
      };
      showResultModal.value = true;
      return;
    }

    // Respuesta exitosa
    batchResult.value = {
      success: result.promoted,
      skipped: result.skipped,
      total: result.total,
      errors: result.details?.filter(d => d.status === 'error' || d.status === 'skipped') || [],
      message: res.message,
    };
    showResultModal.value = true;
    loadStudents();
  } catch (e) {
    // Si llega aquí (raro con validateStatus=true), mostrar errores
    const dataErrors = e.response?.data?.errors;
    const errors = dataErrors
      ? (Array.isArray(dataErrors) ? dataErrors : Object.values(dataErrors).flat())
      : [e.response?.data?.message || 'Error en promoción masiva'];

    batchResult.value = {
      success: 0,
      skipped: students.value.length,
      total: students.value.length,
      errors,
    };
    showResultModal.value = true;
  } finally {
    promoting.value = false;
  }
};

const closeResult = () => {
  showResultModal.value = false;
  batchResult.value = null;
};

const getEligibilityReason = (eligibility) => {
  if (!eligibility) return '';
  if (eligibility.eligible) return 'Elegible';
  if (eligibility.subjects_failed > 0) {
    return `${eligibility.subjects_failed} materia(s) reprobada(s)`;
  }
  if (eligibility.subjects_pending > 0) {
    return `${eligibility.subjects_pending} materia(s) pendiente(s)`;
  }
  if (!eligibility.next_grade) return 'Sin siguiente grado';
  return eligibility.message || 'No elegible';
};

onMounted(fetchData);
</script>

<template>
  <div class="promotions-view">
    <div class="page-header">
      <h2>Promociones</h2>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <span class="loading-spinner"></span>
      Cargando...
    </div>

    <!-- Error -->
    <div v-else-if="error.message" class="error-message" :data-type="error.type">
      <p>{{ error.message }}</p>
      <button v-if="error.type !== 'notfound'" @click="fetchData" class="btn-retry">Reintentar</button>
    </div>

    <template v-else>
      <!-- Filtros en cascada: Año → Grado → Paralelo -->
      <div class="cascade-filters">
        <div class="cascade-step">
          <label>1. Año Lectivo</label>
          <select v-model="selectedYearId">
            <option value="">Seleccionar año</option>
            <option v-for="year in availableYears" :key="year.id" :value="year.id">
              {{ year.name }}
            </option>
          </select>
        </div>

        <div class="cascade-step" :class="{ disabled: !selectedYearId }">
          <label>2. Grado</label>
          <select v-model="selectedGradeId" :disabled="!selectedYearId">
            <option value="">Seleccionar grado</option>
            <option v-for="grade in availableGrades" :key="grade.id" :value="grade.id">
              {{ grade.name }}
            </option>
          </select>
        </div>

        <div class="cascade-step" :class="{ disabled: !selectedGradeId }">
          <label>3. Paralelo</label>
          <select v-model="selectedSection" :disabled="!selectedGradeId">
            <option value="">Seleccionar paralelo</option>
            <option v-for="section in availableSections" :key="section.id" :value="section.id">
              {{ section.name }} ({{ section.enrolled_count || 0 }}/{{ section.max_capacity || '∞' }} estudiantes)
            </option>
          </select>
        </div>
      </div>

      <!-- Info del contexto actual -->
      <div v-if="currentSectionInfo" class="context-info">
        <div class="context-card current">
          <h4>📋 Sección Origen</h4>
          <p><strong>{{ currentSectionInfo.grade?.name }} - {{ currentSectionInfo.name }}</strong></p>
          <p>{{ currentSchoolYear?.name }}</p>
        </div>

        <div class="context-arrow">→</div>

        <div class="context-card target">
          <h4>📋 Sección Destino</h4>
          <p v-if="moveType === 'promote'"><strong>{{ destSections[0]?.grade?.name || '...' }} - Sección destino</strong></p>
          <p v-else><strong>{{ currentSectionInfo.grade?.name }} - Sección destino</strong></p>
          <p>{{ targetSchoolYear?.name || '...' }}</p>
        </div>
      </div>

      <!-- Selector de tipo de movimiento -->
      <div v-if="selectedSection" class="move-type-selector">
        <label class="radio-label">
          <input type="radio" v-model="moveType" value="promote" />
          <span class="radio-text">Promover al siguiente grado</span>
        </label>
        <label class="radio-label">
          <input type="radio" v-model="moveType" value="repeat" />
          <span class="radio-text">Repetir grado (mismo grado, siguiente año)</span>
        </label>
      </div>

      <!-- Selector de sección destino -->
      <div v-if="destSections.length > 0 && selectedSection" class="dest-section-selector">
        <label>Sección destino:</label>
        <select v-model="targetSectionId">
          <option value="">Seleccionar sección</option>
          <option v-for="section in destSections" :key="section.id" :value="section.id">
            {{ section.grade?.name }} - {{ section.name }} ({{ section.enrolled_count || 0 }}/{{ section.max_capacity || '∞' }})
          </option>
        </select>
      </div>

      <span v-if="selectedSection && expectedGradeId && destSections.length === 0" class="no-target-warning">
        ⚠️ No hay secciones disponibles en el grado/año destino
      </span>

      <button
        v-if="selectedSection && expectedGradeId && destSections.length > 0"
        @click="promoteAll"
        class="btn-primary btn-promote-all"
        :disabled="promoting || !targetSectionId"
      >
        {{ promoting ? 'Promoviendo...' : 'Promover todos los elegibles' }}
      </button>

      <!-- Tabla de estudiantes -->
      <table v-if="students.length > 0" class="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Cédula</th>
            <th>Grado Actual</th>
            <th>Año Lectivo</th>
            <th>Elegibilidad</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="student in students" :key="student.id">
            <td>{{ student.first_name }} {{ student.last_name }}</td>
            <td>{{ student.identification_number || '—' }}</td>
            <td>{{ student.section?.grade?.name || '—' }}</td>
            <td>{{ student.section?.schoolYear?.name || currentSchoolYear?.name || '—' }}</td>
            <td>
              <span v-if="student.eligibility" class="eligibility-badge" :class="student.eligibility.eligible ? 'eligible' : 'not-eligible'">
                <span class="eligibility-icon">{{ student.eligibility.eligible ? '✅' : '❌' }}</span>
                <span class="eligibility-text">{{ student.eligibility.eligible ? 'Elegible' : getEligibilityReason(student.eligibility) }}</span>
              </span>
              <span v-else class="eligibility-badge unknown">
                <span class="eligibility-icon">⏳</span>
                <span class="eligibility-text">Verificando...</span>
              </span>
            </td>
            <td>
              <button @click="openConfirm(student)" class="btn-primary btn-sm" :disabled="student.eligibility && !student.eligibility.eligible && moveType === 'promote'">
                {{ moveType === 'promote' ? 'Promover' : 'Repetir' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else-if="selectedSection" class="empty-state">
        <p>No hay estudiantes en esta sección.</p>
      </div>
    </template>

    <!-- Modal de confirmación individual -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="closeConfirm">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ moveType === 'promote' ? 'Promover Estudiante' : 'Repetir Grado' }}</h3>
          <button @click="closeConfirm" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="student-info">
            <p><strong>Estudiante:</strong> {{ confirmTarget?.first_name }} {{ confirmTarget?.last_name }}</p>
            <p><strong>Grado actual:</strong> {{ currentSectionInfo?.grade?.name }} - {{ currentSectionInfo?.name }}</p>
            <p v-if="currentSchoolYear"><strong>Año lectivo:</strong> {{ currentSchoolYear.name }}</p>
          </div>

          <div class="move-summary">
            <p v-if="moveType === 'promote'">
              → <strong>Siguiente grado</strong> — Año Lectivo {{ targetSchoolYear?.name || '...' }}
            </p>
            <p v-else>
              → <strong>Mismo grado</strong> — Año Lectivo {{ targetSchoolYear?.name || '...' }}
            </p>
          </div>

          <div v-if="targetSectionId" class="target-section">
            Sección destino: <strong>{{ targetSectionName }}</strong>
          </div>
          <p v-else class="target-warning">⚠️ Selecciona una sección destino primero</p>

          <!-- Estudiantes ya en la sección destino -->
          <div v-if="targetSectionId" class="dest-students">
            <h4>Estudiantes en la sección destino:</h4>
            <div v-if="loadingTargetStudents" class="loading-small">
              <span class="loading-spinner"></span> Cargando...
            </div>
            <div v-else-if="targetSectionStudents.length === 0" class="empty-dest">
              No hay estudiantes en esta sección.
            </div>
            <ul v-else class="dest-students-list">
              <li v-for="s in targetSectionStudents" :key="s.id">
                {{ s.first_name }} {{ s.last_name }} — {{ s.identification_number || '—' }}
              </li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeConfirm" class="btn-cancel" :disabled="promoting">Cancelar</button>
          <button @click="promoteStudent" class="btn-primary" :disabled="promoting || !targetSectionId">
            {{ promoting ? 'Procesando...' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de resultado (éxito o error) -->
    <div v-if="showResultModal" class="modal-overlay" @click.self="closeResult">
      <div class="modal">
        <div class="modal-header">
          <h3>Resultado de Promoción</h3>
          <button @click="closeResult" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="result-summary">
            <span v-if="batchResult?.success > 0" class="result-success">
              ✅ {{ batchResult.success }} usuario(s) actualizado(s)
            </span>
            <span v-if="batchResult?.skipped > 0" class="result-skipped">
              ⏭️ {{ batchResult.skipped }} saltado(s)
            </span>
          </div>

          <details v-if="batchResult?.errors && batchResult.errors.length > 0" class="error-details" open>
            <summary>⚠️ Ver {{ batchResult.errors.length }} error(es) o conflicto(s)</summary>
            <ul>
              <li v-for="(err, i) in batchResult.errors" :key="i">
                <strong>{{ err.student_name || err.user_name || 'Estudiante' }}</strong>: {{ err.reason || err }}
              </li>
            </ul>
          </details>

          <p v-if="batchResult?.message && !batchResult.errors.length" class="result-message">
            {{ batchResult.message }}
          </p>
        </div>
        <div class="modal-footer">
          <button @click="closeResult" class="btn-primary">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.promotions-view { padding: 20px; }
.page-header { margin-bottom: 24px; }
.loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 40px 0; color: #6b7280; }
.loading-spinner { width: 20px; height: 20px; border: 3px solid #e5e7eb; border-top-color: #7c3aed; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-message { text-align: center; padding: 32px 16px; border: 1px solid #fecaca; border-radius: 8px; margin: 16px 0; color: #dc2626; background: #fef2f2; }
.btn-retry { margin-top: 12px; padding: 8px 20px; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer; }
.btn-retry:hover { background: #6d28d9; }
.empty-state { text-align: center; padding: 40px; color: #6b7280; background: #f9fafb; border-radius: 8px; }

/* Filtros en cascada */
.cascade-filters {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.cascade-step {
  flex: 1;
  min-width: 200px;
}
.cascade-step label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.cascade-step select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.15s ease;
}
.cascade-step select:focus {
  outline: none;
  border-color: #7c3aed;
  box-shadow: 0 0 0 2px rgba(124,58,237,0.1);
}
.cascade-step.disabled select {
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

/* Contexto origen → destino */
.context-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.context-card {
  flex: 1;
  min-width: 180px;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid;
}
.context-card h4 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.context-card p { margin: 2px 0; font-size: 14px; }
.context-card.current { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; }
.context-card.current h4 { color: #1e40af; }
.context-card.target { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
.context-card.target h4 { color: #166534; }
.context-arrow {
  font-size: 24px;
  color: #7c3aed;
  font-weight: 700;
}

/* Move type selector */
.move-type-selector {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 8px;
}
.radio-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; }
.radio-text { color: #374151; }

/* Dest section selector */
.dest-section-selector {
  margin-bottom: 16px;
}
.dest-section-selector label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.dest-section-selector select {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  min-width: 300px;
}

.no-target-warning { color: #b45309; font-size: 13px; background: #fffbeb; padding: 6px 12px; border-radius: 6px; border-left: 3px solid #f59e0b; display: inline-block; margin-bottom: 16px; }
.btn-promote-all { margin-bottom: 16px; }

/* Elegibilidad badges */
.eligibility-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.eligibility-badge.eligible {
  background: #dcfce7;
  color: #166534;
}
.eligibility-badge.not-eligible {
  background: #fef2f2;
  color: #dc2626;
}
.eligibility-badge.unknown {
  background: #f3f4f6;
  color: #6b7280;
}
.eligibility-icon { font-size: 12px; }
.eligibility-text { font-size: 11px; }

/* Modal overlay */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 12px; width: 500px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.15); max-height: 80vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e5e7eb; }
.modal-header h3 { margin: 0; font-size: 18px; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280; }
.modal-body { padding: 20px; font-size: 14px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid #e5e7eb; }
.btn-cancel { padding: 8px 16px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; }
.btn-cancel:hover { background: #e5e7eb; }
.btn-primary { padding: 8px 16px; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer; }
.btn-primary:hover { background: #6d28d9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sm { padding: 4px 10px; font-size: 12px; margin-right: 4px; }

/* Student info in modal */
.student-info { background: #f9fafb; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
.student-info p { margin: 4px 0; font-size: 13px; }
.move-summary { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; font-size: 13px; color: #1e40af; }
.target-section { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 12px; font-size: 13px; color: #166534; }
.target-warning { font-size: 13px; color: #b45309; background: #fffbeb; padding: 10px 12px; border-radius: 6px; }

/* Estudiantes en sección destino */
.dest-students { margin-top: 12px; }
.dest-students h4 { margin: 0 0 8px; font-size: 13px; color: #374151; font-weight: 600; }
.loading-small { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; }
.loading-small .loading-spinner { width: 14px; height: 14px; border-width: 2px; }
.empty-dest { font-size: 12px; color: #6b7280; font-style: italic; }
.dest-students-list { margin: 0; padding: 0 0 0 16px; font-size: 12px; color: #374151; max-height: 120px; overflow-y: auto; }
.dest-students-list li { padding: 3px 0; border-bottom: 1px solid #f3f4f6; }
.dest-students-list li:last-child { border-bottom: none; }

/* Result modal */
.result-summary { display: flex; gap: 16px; margin-bottom: 12px; }
.result-success { color: #166534; font-weight: 600; font-size: 14px; }
.result-skipped { color: #92400e; font-weight: 600; font-size: 14px; }
.error-details { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px 12px; margin-top: 8px; }
.error-details summary { cursor: pointer; font-weight: 600; color: #dc2626; font-size: 13px; }
.error-details ul { margin: 8px 0 0 16px; font-size: 12px; color: #991b1b; }
.error-details li { margin-bottom: 4px; }
.result-message { color: #166534; font-size: 14px; margin-top: 8px; }

/* Data table */
.data-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.data-table th { background: #f9fafb; padding: 12px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; }
.data-table td { padding: 10px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; }
.data-table tr:hover { background: #f9fafb; }
.data-table tr:last-child td { border-bottom: none; }
</style>
