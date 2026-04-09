<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { apiNormalized as api } from '../../services/apiNormalized';

const route = useRoute();
const studentId = route.params.id;

const student = ref(null);
const courses = ref([]);
const summary = ref(null);
const loading = ref(true);
const error = ref({ message: '', type: '' });

const fetchData = async () => {
  loading.value = true;
  error.value = { message: '', type: '' };

  try {
    const res = await api.get(`/admin/students/${studentId}/academic-history`);
    student.value = res.data.student;
    courses.value = res.data.courses || [];
    summary.value = res.data.summary;
  } catch (e) {
    const msg = e.response?.data?.message || 'Error al cargar historial académico';
    const status = e.response?.status;
    error.value = {
      message: status === 404 ? 'Estudiante no encontrado' :
               status === 403 ? 'No tienes permiso para ver esta información' :
               msg,
      type: status === 404 ? 'notfound' : status === 403 ? 'auth' : 'server'
    };
  } finally {
    loading.value = false;
  }
};

const getStatusBadge = (status) => {
  const map = {
    'aprobado': 'badge-success',
    'reprobado': 'badge-danger',
    'cursando': 'badge-info',
    'concluido': 'badge-secondary',
    'retirado': 'badge-secondary',
  };
  return map[status] || 'badge-secondary';
};

const getStatusLabel = (status) => {
  const map = {
    'aprobado': 'Aprobado',
    'reprobado': 'Reprobado',
    'cursando': 'Cursando',
    'concluido': 'Concluido',
    'retirado': 'Retirado',
  };
  return map[status] || status;
};

onMounted(fetchData);
</script>

<template>
  <div class="academic-history-view">
    <div class="page-header">
      <button @click="$router.back()" class="btn-back">← Volver</button>
      <h2>Historial Académico</h2>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <span class="loading-spinner"></span>
      Cargando historial académico...
    </div>

    <!-- Error -->
    <div v-else-if="error.message" class="error-message" :data-type="error.type">
      <span class="error-icon">{{ error.type === 'notfound' ? '🔍' : error.type === 'auth' ? '🔒' : '⚠️' }}</span>
      <p>{{ error.message }}</p>
      <button v-if="error.type !== 'notfound'" @click="fetchData" class="btn-retry">Reintentar</button>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Info del estudiante -->
      <div v-if="student" class="student-info-card">
        <h3>{{ student.name }}</h3>
        <div class="student-details">
          <span v-if="student.identification_number">Cédula: {{ student.identification_number }}</span>
          <span v-if="student.current_grade">Grado actual: {{ student.current_grade }}</span>
          <span v-if="student.current_section">Sección: {{ student.current_section }}</span>
        </div>
      </div>

      <!-- Resumen -->
      <div v-if="summary" class="summary-cards">
        <div class="summary-card">
          <span class="summary-number">{{ summary.total }}</span>
          <span class="summary-label">Total materias</span>
        </div>
        <div class="summary-card approved">
          <span class="summary-number">{{ summary.approved }}</span>
          <span class="summary-label">Aprobadas</span>
        </div>
        <div class="summary-card failed">
          <span class="summary-number">{{ summary.failed }}</span>
          <span class="summary-label">Reprobadas</span>
        </div>
        <div class="summary-card pending">
          <span class="summary-number">{{ summary.pending }}</span>
          <span class="summary-label">Cursando</span>
        </div>
      </div>

      <!-- Tabla de historial -->
      <div v-if="courses.length === 0" class="empty-state">
        <p>No hay registros académicos para este estudiante.</p>
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Materia</th>
            <th>Parcial 1</th>
            <th>Parcial 2</th>
            <th>Nota Final</th>
            <th>Estado</th>
            <th>Año Lectivo</th>
            <th>Grado</th>
            <th>Sección</th>
            <th>Profesor</th>
            <th>Fecha Cierre</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="course in courses" :key="course.id">
            <td>{{ course.subject }}</td>
            <td>{{ course.parcial_1 ?? '—' }}</td>
            <td>{{ course.parcial_2 ?? '—' }}</td>
            <td>{{ course.final_grade ?? '—' }}</td>
            <td>
              <span :class="['badge', getStatusBadge(course.status)]">
                {{ getStatusLabel(course.status) }}
              </span>
            </td>
            <td>{{ course.school_year }}</td>
            <td>{{ course.grade }}</td>
            <td>{{ course.section }}</td>
            <td>{{ course.profesor }}</td>
            <td>{{ course.closed_at ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<style scoped>
.academic-history-view {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.btn-back {
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.15s ease;
}

.btn-back:hover {
  background: #e5e7eb;
}

.student-info-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 20px;
}

.student-info-card h3 {
  margin: 0 0 8px;
  font-size: 18px;
  color: #111827;
}

.student-details {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #6b7280;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.summary-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.summary-card .summary-number {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #374151;
}

.summary-card .summary-label {
  font-size: 13px;
  color: #6b7280;
}

.summary-card.approved .summary-number { color: #16a34a; }
.summary-card.failed .summary-number { color: #dc2626; }
.summary-card.pending .summary-number { color: #2563eb; }

.empty-state {
  text-align: center;
  padding: 40px;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
}

/* Reuse existing styles */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 0;
  font-size: 15px;
  color: #6b7280;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #e5e7eb;
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  text-align: center;
  padding: 32px 16px;
  border: 1px solid;
  border-radius: 8px;
  margin: 16px 0;
}

.error-message[data-type="notfound"] {
  color: #6b7280;
  background: #f9fafb;
  border-color: #e5e7eb;
}

.error-message[data-type="auth"] {
  color: #b45309;
  background: #fffbeb;
  border-color: #fde68a;
}

.error-message[data-type="server"] {
  color: #dc2626;
  background: #fef2f2;
  border-color: #fecaca;
}

.error-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.error-message p {
  margin: 0 0 12px;
  font-size: 15px;
}

.btn-retry {
  display: inline-block;
  margin-top: 12px;
  padding: 8px 20px;
  background: #7c3aed;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.15s ease;
}

.btn-retry:hover {
  background: #6d28d9;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.badge-success { background: #dcfce7; color: #166534; }
.badge-danger { background: #fef2f2; color: #dc2626; }
.badge-info { background: #dbeafe; color: #1e40af; }
.badge-secondary { background: #f3f4f6; color: #6b7280; }
</style>
