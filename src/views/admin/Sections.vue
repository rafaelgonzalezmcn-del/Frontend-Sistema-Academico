<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { apiNormalized as api } from '../../services/apiNormalized';
import apiRaw from '../../services/api';
import SelectorModal from '../../components/SelectorModal.vue';

const sections = ref([]);
const grades = ref([]);
const schoolYears = ref([]);
const loading = ref(true);
const error = ref('');
const showModal = ref(false);
const showEnrollModal = ref(false);
const showConfirmModal = ref(false);
const editingItem = ref(null);
const selectedSection = ref(null);
const confirmData = ref({ student: null, currentSection: null });
const form = ref({
  name: '',
  grade_id: '',
  school_year_id: '',
  max_capacity: ''
});

const enrollForm = ref({
  availableStudents: [],
  enrolledStudents: [],
  selectedAvailable: [],
  selectedEnrolled: []
});

const searchQuery = ref('');
const filterGrade = ref('');
const filterSchoolYear = ref('');
const studentSearchQuery = ref(''); // Separate for enrollment modal
const currentPage = ref(1);
const perPage = 15;

// Paginación client-side sobre datos filtrados
const paginatedSections = computed(() => {
  const filtered = filteredSections.value;
  const start = (currentPage.value - 1) * perPage;
  const end = start + perPage;
  return filtered.slice(start, end);
});

const lastPage = computed(() => Math.ceil(filteredSections.value.length / perPage));

const totalCount = computed(() => filteredSections.value.length);

const goToPage = (page) => {
  if (page >= 1 && page <= lastPage.value) {
    currentPage.value = page;
  }
};

const prevPage = () => goToPage(currentPage.value - 1);
const nextPage = () => goToPage(currentPage.value + 1);

// Números de página visibles (más completo como Users.vue)
const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
  let end = Math.min(lastPage.value, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

const fetchData = async () => {
  loading.value = true;
  currentPage.value = 1;
  try {
    const [sectionsRes, gradesRes, yearsRes] = await Promise.all([
      api.get('/sections', { params: { per_page: 100 } }),
      api.get('/grades'),
      api.get('/school-years')
    ]);
    // Con apiNormalized, response.data ya tiene los datos normalizados
    sections.value = sectionsRes.data;
    grades.value = gradesRes.data;
    schoolYears.value = yearsRes.data;
  } catch (e) {
    error.value = 'Error al cargar secciones';
  } finally {
    loading.value = false;
  }
};

const fetchStudents = async (sectionId) => {
  try {
    // Obtener estudiantes matriculados en esta sección
    const enrolledRes = await api.get('/users', { params: { role: 'estudiante', section_id: sectionId } });
    console.log('Enrolled response:', enrolledRes);
    enrollForm.value.enrolledStudents = enrolledRes.data || [];
    console.log('Enrolled students:', enrollForm.value.enrolledStudents);

    // Obtener estudiantes disponibles (sin sección o en otra sección)
    // Obtener todos los usuarios con rol estudiante (sin paginación)
    const availableRes = await apiRaw.get('/users', { params: { role: 'estudiante', per_page: 100 } });
    console.log('Available response:', availableRes);
    const allStudents = availableRes.data?.data || availableRes.data || [];
    console.log('All students', allStudents);
    
    // Filtrar estudiantes que no están en esta sección
    enrollForm.value.availableStudents = allStudents.filter(s => s.section_id !== sectionId);
    console.log('Available students:', enrollForm.value.availableStudents);
  } catch (e) {
    console.error('Error loading students:', e);
    error.value = 'Error al cargar estudiantes: ' + (e.response?.data?.message || e.message);
  }
};

const filteredSections = computed(() => {
  let result = sections.value;
  
  // Filtrar por nombre
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(s => 
      s.name.toLowerCase().includes(query)
    );
  }
  
  // Filtrar por grado
  if (filterGrade.value) {
    result = result.filter(s => s.grade_id == filterGrade.value);
  }
  
  // Filtrar por año lectivo
  if (filterSchoolYear.value) {
    result = result.filter(s => s.school_year_id == filterSchoolYear.value);
  }
  
  // Reset page when filters change
  return result;
});

// Reset page when filters change
const resetPageOnFilterChange = () => {
  currentPage.value = 1;
};

// Watch section filters - reset to page 1 when filter changes 
// (user is intentionally filtering, so start from beginning)
watch([searchQuery, filterGrade, filterSchoolYear], () => {
  currentPage.value = 1;
});

const filteredAvailableStudents = computed(() => {
  if (!studentSearchQuery.value) return enrollForm.value.availableStudents;
  const query = studentSearchQuery.value.toLowerCase();
  return enrollForm.value.availableStudents.filter(s => 
    (s.first_name && s.first_name.toLowerCase().includes(query)) ||
    (s.last_name && s.last_name.toLowerCase().includes(query)) ||
    (s.identification_number && s.identification_number.toLowerCase().includes(query))
  );
});

const openEnrollModal = async (section) => {
  selectedSection.value = section;
  await fetchStudents(section.id);
  showEnrollModal.value = true;
};

const closeEnrollModal = () => {
  showEnrollModal.value = false;
  selectedSection.value = null;
  enrollForm.value.selectedAvailable = [];
  enrollForm.value.selectedEnrolled = [];
  studentSearchQuery.value = '';
};

const enrollStudent = async (studentId) => {
  try {
    await apiRaw.patch(`/users/${studentId}/assign-section`, { section_id: selectedSection.value.id });
    await fetchStudents(selectedSection.value.id);
  } catch (e) {
    const status = e.response?.status;
    const data = e.response?.data;
    
    if (status === 409) {
      confirmData.value = {
        student: enrollForm.value.availableStudents.find(s => s.id === studentId),
        currentSection: data?.current_section
      };
      showConfirmModal.value = true;
    } else {
      error.value = data?.message || 'Error al matricular';
    }
  }
};

const confirmEnrollment = async () => {
  try {
    await api.patch(`/users/${confirmData.value.student.id}/assign-section`, {
      section_id: selectedSection.value.id,
      force: true
    });
    showConfirmModal.value = false;
    await fetchStudents(selectedSection.value.id);
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al matricular';
    showConfirmModal.value = false;
  }
};

const cancelEnrollment = () => {
  showConfirmModal.value = false;
  confirmData.value = { student: null, currentSection: null };
};

const unenrollStudent = async (studentId) => {
  try {
    await api.patch(`/users/${studentId}/assign-section`, { section_id: null });
    await fetchStudents(selectedSection.value.id);
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al desmatricular';
  }
};

const openModal = (item = null) => {
  editingItem.value = item;
  if (item) {
    form.value = {
      name: item.name,
      grade_id: item.grade_id,
      school_year_id: item.school_year_id,
      max_capacity: item.max_capacity ?? ''
    };
  } else {
    form.value = { name: '', grade_id: '', school_year_id: '', max_capacity: '' };
  }
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingItem.value = null;
};

const saveItem = async () => {
  try {
    const data = {
      name: form.value.name,
      grade_id: form.value.grade_id,
      school_year_id: form.value.school_year_id,
    };
    // Solo enviar max_capacity si tiene valor numérico
    if (form.value.max_capacity !== '' && form.value.max_capacity !== null) {
      data.max_capacity = parseInt(form.value.max_capacity, 10);
    }

    if (editingItem.value) {
      await api.put(`/sections/${editingItem.value.id}`, data);
    } else {
      await api.post('/sections', data);
    }
    await fetchData();
    closeModal();
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al guardar';
  }
};

const deleteItem = async (id) => {
  if (!confirm('¿Eliminar esta sección?')) return;
  try {
    await api.delete(`/sections/${id}`);
    await fetchData();
  } catch (e) {
    error.value = e.response?.data?.message || 'Error';
  }
};

const getGradeName = (gradeId) => {
  const grade = grades.value.find(g => g.id === gradeId);
  return grade?.name || '-';
};

const getSchoolYearName = (yearId) => {
  const year = schoolYears.value.find(y => y.id === yearId);
  return year?.name || '-';
};

onMounted(fetchData);
</script>

<template>
  <div class="sections-view">
    <div class="page-header">
      <h2>Secciones</h2>
      <button @click="openModal()" class="btn-primary">+ Nueva Sección</button>
    </div>
    
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="loading" class="loading">Cargando...</div>
    
    <!-- Filtros -->
    <div class="filters-section">
      <div class="filter-group">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Buscar por nombre..." 
          class="filter-input"
        />
      </div>
      <div class="filter-group">
        <select v-model="filterGrade" class="filter-select">
          <option value="">Todos los grados</option>
          <option v-for="grade in grades" :key="grade.id" :value="grade.id">
            {{ grade.name }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <select v-model="filterSchoolYear" class="filter-select">
          <option value="">Todos los años lectivos</option>
          <option v-for="year in schoolYears" :key="year.id" :value="year.id">
            {{ year.name }}
          </option>
        </select>
      </div>
      <button @click="searchQuery = ''; filterGrade = ''; filterSchoolYear = ''" class="btn-secondary btn-sm">
        Limpiar
      </button>
    </div>
    
    <table v-if="!loading && !error" class="data-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Grado</th>
          <th>Año Lectivo</th>
          <th>Capacidad</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in paginatedSections" :key="item.id">
          <td>{{ item.name }}</td>
          <td>{{ item.grade?.name || getGradeName(item.grade_id) }}</td>
          <td>{{ item.school_year?.name || getSchoolYearName(item.school_year_id) }}</td>
          <td>
            <span v-if="item.max_capacity" :class="['capacity-badge', item.capacity_info?.is_full ? 'full' : 'available']">
              {{ item.enrolled_count ?? '—' }}/{{ item.max_capacity }}
            </span>
            <span v-else class="capacity-badge unlimited">Ilimitada</span>
          </td>
          <td>
            <button @click="openModal(item)" class="btn-primary btn-sm">Editar</button>
            <button @click="openEnrollModal(item)" class="btn-secondary btn-sm">Matricular Estudiantes</button>
            <button @click="deleteItem(item.id)" class="btn-danger btn-sm">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>
    
    <!-- Paginación -->
    <div v-if="lastPage > 1" class="pagination-container">
      <div class="pagination-info">
        Mostrando {{ paginatedSections.length }} de {{ totalCount }} secciones
        <span>— Página {{ currentPage }} de {{ lastPage }}</span>
      </div>
      <div class="pagination-controls">
        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          class="btn-pagination"
          :class="{ disabled: currentPage === 1 }"
        >
          &laquo; Anterior
        </button>

        <button
          v-if="visiblePages[0] > 1"
          @click="goToPage(1)"
          class="btn-pagination"
          :class="{ active: currentPage === 1 }"
        >
          1
        </button>
        <span v-if="visiblePages[0] > 2" class="pagination-ellipsis">...</span>

        <button
          v-for="page in visiblePages"
          :key="page"
          @click="goToPage(page)"
          class="btn-pagination"
          :class="{ active: page === currentPage }"
        >
          {{ page }}
        </button>

        <span v-if="visiblePages[visiblePages.length - 1] < lastPage - 1" class="pagination-ellipsis">...</span>
        <button
          v-if="visiblePages[visiblePages.length - 1] < lastPage"
          @click="goToPage(lastPage)"
          class="btn-pagination"
          :class="{ active: currentPage === lastPage }"
        >
          {{ lastPage }}
        </button>

        <button
          @click="nextPage"
          :disabled="currentPage === lastPage"
          class="btn-pagination"
          :class="{ disabled: currentPage === lastPage }"
        >
          Siguiente &raquo;
        </button>
      </div>
    </div>
    
    <div v-else-if="totalCount === 0 && !loading" class="empty-list">
      No hay secciones que mostrar
    </div>
    
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingItem ? 'Editar' : 'Nueva' }} Sección</h3>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="saveItem" class="modal-body">
          <div class="form-group">
            <label>Nombre *</label>
            <input v-model="form.name" required placeholder="ej: Sección A" />
          </div>
          <div class="form-group">
            <label>Grado *</label>
            <select v-model="form.grade_id" required>
              <option value="">Seleccionar grado</option>
              <option v-for="grade in grades" :key="grade.id" :value="grade.id">
                {{ grade.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Año Lectivo *</label>
            <select v-model="form.school_year_id" required>
              <option value="">Seleccionar año</option>
              <option v-for="year in schoolYears" :key="year.id" :value="year.id">
                {{ year.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Capacidad máxima (opcional)</label>
            <input v-model.number="form.max_capacity" type="number" min="0" placeholder="ej: 35 (dejar vacío para ilimitada)" />
            <small class="form-help">Número máximo de estudiantes. Si se deja vacío, no hay límite.</small>
          </div>
          <div class="modal-footer">
            <button type="button" @click="closeModal" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Modal de Matrícula -->
    <div v-if="showEnrollModal" class="modal-overlay" @click.self="closeEnrollModal">
      <div class="modal modal-large">
        <div class="modal-header">
          <h3>Matricular Estudiantes - {{ selectedSection?.name }}</h3>
          <button @click="closeEnrollModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="enroll-container">
            <!-- Estudiantes Disponibles -->
            <div class="student-list">
              <h4>Estudiantes Disponibles</h4>
              <input 
                v-model="studentSearchQuery" 
                type="text" 
                placeholder="Buscar por cédula, nombre o apellido..."
                class="search-input"
              />
              <div v-if="filteredAvailableStudents.length === 0" class="empty-list">No hay estudiantes disponibles</div>
              <div v-else class="list-items">
                <div v-for="student in filteredAvailableStudents" :key="student.id" class="list-item">
                  <div class="student-info">
                    <span class="student-name">{{ student.first_name }} {{ student.last_name }}</span>
                    <span class="student-id">{{ student.identification_number }}</span>
                    <span v-if="student.section_id" class="current-section-badge">
                      {{ student.section?.name || 'Sección #' + student.section_id }}
                    </span>
                  </div>
                  <button @click="enrollStudent(student.id)" class="btn-primary btn-sm">Matricular</button>
                </div>
              </div>
            </div>
            
            <!-- Estudiantes Matriculados -->
            <div class="student-list">
              <h4>Estudiantes Matriculados</h4>
              <div v-if="enrollForm.enrolledStudents.length === 0" class="empty-list">No hay estudiantes matriculados</div>
              <div v-else class="list-items">
                <div v-for="student in enrollForm.enrolledStudents" :key="student.id" class="list-item">
                  <div class="student-info">
                    <span class="student-name">{{ student.first_name }} {{ student.last_name }}</span>
                    <span class="student-id">{{ student.identification_number }}</span>
                  </div>
                  <button @click="unenrollStudent(student.id)" class="btn-danger btn-sm">Desmatricular</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeEnrollModal" class="btn-primary">Cerrar</button>
        </div>
      </div>
    </div>
    
    <!-- Modal de Confirmación de Matrícula Duplicada -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="cancelEnrollment">
      <div class="modal confirm-modal">
        <div class="modal-header warning-header">
          <h3>⚠️ Reasignar Estudiante</h3>
        </div>
        <div class="modal-body">
          <p>El estudiante <strong>{{ confirmData.student?.first_name }} {{ confirmData.student?.last_name }}</strong></p>
          <p>Identificación: {{ confirmData.student?.identification_number }}</p>
          <p class="warning-text">Ya está matriculado actualmente en:</p>
          <div class="current-enrollment-info">
            <strong>{{ confirmData.currentSection?.name }}</strong> - {{ confirmData.currentSection?.grade }}
          </div>
          <p class="action-text">¿Deseas cambiarlo a <strong>{{ selectedSection?.name }}</strong>?</p>
        </div>
        <div class="modal-footer">
          <button @click="cancelEnrollment" class="btn-cancel">Cancelar</button>
          <button @click="confirmEnrollment" class="btn-warning">Confirmar Cambio</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.capacity-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.capacity-badge.available {
  background: #dcfce7;
  color: #166534;
}

.capacity-badge.full {
  background: #fef2f2;
  color: #dc2626;
}

.capacity-badge.unlimited {
  background: #f3f4f6;
  color: #6b7280;
  font-style: italic;
}

.warning-text {
  color: #dc2626;
  font-weight: 600;
  margin-top: 12px;
}

.action-text {
  color: #059669;
  font-weight: 600;
  margin-top: 12px;
}

.current-section-badge {
  display: inline-block;
  background: #fef3c7;
  color: #92400e;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  margin-left: 8px;
}

.filters-section {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-group {
  flex: 1;
  min-width: 150px;
}

.filter-input,
.filter-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.empty-list {
  text-align: center;
  padding: 32px;
  color: #9ca3af;
}

/* ─── Paginación ──────────────────────────────────────────── */
.pagination-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  padding: 16px 0;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-pagination {
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-pagination:hover:not(.disabled):not(.active) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.btn-pagination.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-pagination.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-ellipsis {
  padding: 0 4px;
  color: #9ca3af;
  font-size: 14px;
}
</style>

