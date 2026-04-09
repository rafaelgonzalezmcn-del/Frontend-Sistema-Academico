<script setup>
import { ref, onMounted, computed } from 'vue';
import { apiNormalized as api } from '../../services/apiNormalized';
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
const fetchData = async () => {
  loading.value = true;
  try {
    const [sectionsRes, gradesRes, yearsRes] = await Promise.all([
      api.get('/sections'),
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
    const availableRes = await api.get('/users', { params: { role: 'estudiante' } });
    console.log('Available response:', availableRes);
    const allStudents = availableRes.data || [];
    console.log('All students', allStudents);
    
    // Filtrar estudiantes que no están en esta sección
    enrollForm.value.availableStudents = allStudents.filter(s => s.section_id !== sectionId);
    console.log('Available students:', enrollForm.value.availableStudents);
  } catch (e) {
    console.error('Error loading students:', e);
    error.value = 'Error al cargar estudiantes: ' + (e.response?.data?.message || e.message);
  }
};

const filteredAvailableStudents = computed(() => {
  if (!searchQuery.value) return enrollForm.value.availableStudents;
  const query = searchQuery.value.toLowerCase();
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
};

const enrollStudent = async (studentId) => {
  try {
    await api.patch(`/users/${studentId}/assign-section`, { section_id: selectedSection.value.id });
    await fetchStudents(selectedSection.value.id);
  } catch (e) {
    if (e.response?.status === 409) {
      // Estudiante ya matriculado, mostrar confirmación
      confirmData.value = {
        student: enrollForm.value.availableStudents.find(s => s.id === studentId),
        currentSection: e.response.data.current_section
      };
      showConfirmModal.value = true;
    } else {
      error.value = e.response?.data?.message || 'Error al matricular';
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
    
    <table v-else class="data-table">
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
        <tr v-for="item in sections" :key="item.id">
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
                v-model="searchQuery" 
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
          <h3>⚠️ Estudiante ya matriculado</h3>
        </div>
        <div class="modal-body">
          <p>El estudiante <strong>{{ confirmData.student?.first_name }} {{ confirmData.student?.last_name }}</strong> ({{ confirmData.student?.identification_number }})</p>
          <p>ya está matriculado en:</p>
          <div class="current-enrollment-info">
            <strong>{{ confirmData.currentSection?.grade }}</strong> - {{ confirmData.currentSection?.name }}
          </div>
          <p>¿Deseas matricularlo en <strong>{{ selectedSection?.grade?.name }} - {{ selectedSection?.name }}</strong>?</p>
        </div>
        <div class="modal-footer">
          <button @click="cancelEnrollment" class="btn-cancel">Cancelar</button>
          <button @click="confirmEnrollment" class="btn-warning">Confirmar Matrícula</button>
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
</style>

