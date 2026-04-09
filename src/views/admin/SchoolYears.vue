<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../../services/api';

const schoolYears = ref([]);
const loading = ref(true);
const error = ref('');
const showModal = ref(false);
const editingItem = ref(null);

// Paginación
const currentPage = ref(1);
const lastPage = ref(1);
const total = ref(0);

const form = ref({
  name: '',
  start_date: '',
  end_date: '',
  active: false,
  grade_order: ''
});

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await api.get('/school-years', { params: { page: currentPage.value } });
    schoolYears.value = res.data.data || res.data;
    if (res.data.meta) {
      currentPage.value = res.data.meta.current_page || 1;
      lastPage.value = res.data.meta.last_page || 1;
      total.value = res.data.meta.total || 0;
    }
  } catch (e) {
    error.value = 'Error al cargar años lectivos';
  } finally {
    loading.value = false;
  }
};

const openModal = (item = null) => {
  editingItem.value = item;
  if (item) {
    form.value = {
      name: item.name,
      start_date: item.start_date ? item.start_date.split('T')[0] : '',
      end_date: item.end_date ? item.end_date.split('T')[0] : '',
      active: item.active,
      grade_order: item.grade_order ?? ''
    };
  } else {
    form.value = { name: '', start_date: '', end_date: '', active: false, grade_order: '' };
  }
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingItem.value = null;
};

const saveItem = async () => {
  try {
    const data = { ...form.value };
    if (data.grade_order === '' || data.grade_order === null) delete data.grade_order;
    else data.grade_order = parseInt(data.grade_order, 10);

    if (editingItem.value) {
      await api.put(`/school-years/${editingItem.value.id}`, data);
    } else {
      await api.post('/school-years', data);
    }
    await fetchData();
    closeModal();
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al guardar';
  }
};

const activateItem = async (id) => {
  try {
    await api.put(`/school-years/${id}/activate`);
    await fetchData();
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al activar';
  }
};

const deleteItem = async (id) => {
  if (!confirm('¿Eliminar este año lectivo?')) return;
  try {
    await api.delete(`/school-years/${id}`);
    await fetchData();
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al eliminar';
  }
};

const sortedYears = computed(() => {
  return [...schoolYears.value].sort((a, b) => {
    if (a.grade_order != null && b.grade_order != null) return a.grade_order - b.grade_order;
    if (a.grade_order != null) return -1;
    if (b.grade_order != null) return 1;
    return new Date(a.start_date) - new Date(b.start_date);
  });
});

const goToPage = (page) => {
  if (page < 1 || page > lastPage.value) return;
  currentPage.value = page;
  fetchData();
};

const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
  let end = Math.min(lastPage.value, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

onMounted(fetchData);
</script>

<template>
  <div class="school-years-view">
    <div class="page-header">
      <h2>Años Lectivos</h2>
      <button @click="openModal()" class="btn-primary">+ Nuevo Año Lectivo</button>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="loading" class="loading">
      <span class="loading-spinner"></span>
      Cargando...
    </div>

    <table v-else class="data-table">
      <thead>
        <tr>
          <th>Orden</th>
          <th>Nombre</th>
          <th>Fecha Inicio</th>
          <th>Fecha Fin</th>
          <th>Estado</th>
          <th>Secciones</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in sortedYears" :key="item.id" :class="{ 'row-active': item.active }">
          <td class="order-cell">{{ item.grade_order ?? '—' }}</td>
          <td class="name-cell">
            {{ item.name }}
            <span v-if="item.active" class="active-badge">Activo</span>
          </td>
          <td>{{ formatDate(item.start_date) }}</td>
          <td>{{ formatDate(item.end_date) }}</td>
          <td>
            <span :class="['badge', item.active ? 'badge-success' : 'badge-secondary']">
              {{ item.active ? 'Activo' : 'Inactivo' }}
            </span>
          </td>
          <td>{{ item.sections_count ?? item.sections?.length ?? 0 }}</td>
          <td>
            <button v-if="!item.active" @click="activateItem(item.id)" class="btn-activate btn-sm">
              Activar
            </button>
            <button @click="openModal(item)" class="btn-primary btn-sm">Editar</button>
            <button @click="deleteItem(item.id)" class="btn-danger btn-sm">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Paginación -->
    <div v-if="lastPage > 1" class="pagination-container">
      <div class="pagination-info">
        Mostrando {{ schoolYears.length }} de {{ total }} años lectivos
        <span v-if="lastPage > 1">— Página {{ currentPage }} de {{ lastPage }}</span>
      </div>
      <div class="pagination-controls">
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="btn-pagination" :class="{ disabled: currentPage === 1 }">
          « Anterior
        </button>
        <button v-if="visiblePages[0] > 1" @click="goToPage(1)" class="btn-pagination">1</button>
        <span v-if="visiblePages[0] > 2" class="pagination-ellipsis">...</span>
        <button v-for="page in visiblePages" :key="page" @click="goToPage(page)" class="btn-pagination" :class="{ active: page === currentPage }">
          {{ page }}
        </button>
        <span v-if="visiblePages[visiblePages.length - 1] < lastPage - 1" class="pagination-ellipsis">...</span>
        <button v-if="visiblePages[visiblePages.length - 1] < lastPage" @click="goToPage(lastPage)" class="btn-pagination">{{ lastPage }}</button>
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage === lastPage" class="btn-pagination" :class="{ disabled: currentPage === lastPage }">
          Siguiente »
        </button>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingItem ? 'Editar' : 'Nuevo' }} Año Lectivo</h3>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="saveItem" class="modal-body">
          <div class="form-group">
            <label>Nombre *</label>
            <input v-model="form.name" required placeholder="ej: Año Lectivo 2027-2028" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Fecha Inicio *</label>
              <input v-model="form.start_date" type="date" required />
            </div>
            <div class="form-group">
              <label>Fecha Fin *</label>
              <input v-model="form.end_date" type="date" required />
            </div>
          </div>
          <div class="form-group">
            <label>Orden (opcional)</label>
            <input v-model.number="form.grade_order" type="number" min="1" placeholder="ej: 1, 2, 3..." />
            <small class="form-help">Define el orden académico. Si se deja vacío, se ordena por fecha de inicio.</small>
          </div>
          <div class="form-group" v-if="editingItem">
            <label class="checkbox-label">
              <input v-model="form.active" type="checkbox" />
              Activo
            </label>
          </div>
          <div class="modal-footer">
            <button type="button" @click="closeModal" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.school-years-view { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 40px 0; color: #6b7280; }
.loading-spinner { width: 20px; height: 20px; border: 3px solid #e5e7eb; border-top-color: #7c3aed; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-message { text-align: center; padding: 32px 16px; border: 1px solid #fecaca; border-radius: 8px; margin: 16px 0; color: #dc2626; background: #fef2f2; }

/* Tabla */
.data-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.data-table th { background: #f9fafb; padding: 12px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; }
.data-table td { padding: 10px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; }
.data-table tr:hover { background: #f9fafb; }
.data-table tr:last-child td { border-bottom: none; }
.row-active { background: #f0fdf4 !important; }
.order-cell { font-weight: 600; color: #6b7280; text-align: center; width: 60px; }
.name-cell { font-weight: 500; }

/* Badges */
.badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.badge-success { background: #dcfce7; color: #166534; }
.badge-secondary { background: #f3f4f6; color: #6b7280; }
.active-badge { display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: #dcfce7; color: #166534; }

/* Botones */
.btn-sm { padding: 4px 10px; font-size: 12px; margin-right: 4px; border: none; border-radius: 4px; cursor: pointer; }
.btn-primary { background: #7c3aed; color: white; }
.btn-primary:hover { background: #6d28d9; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }
.btn-activate { background: #22c55e; color: white; }
.btn-activate:hover { background: #16a34a; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 12px; width: 500px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e5e7eb; }
.modal-header h3 { margin: 0; font-size: 18px; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280; }
.modal-body { padding: 20px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid #e5e7eb; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 4px; font-size: 13px; font-weight: 500; color: #374151; }
.form-group input[type="text"],
.form-group input[type="date"],
.form-group input[type="number"] { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
.form-group input:focus { outline: none; border-color: #7c3aed; box-shadow: 0 0 0 2px rgba(124,58,237,0.1); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-help { display: block; margin-top: 4px; font-size: 12px; color: #6b7280; }
.checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
.btn-cancel { padding: 8px 16px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; }
.btn-cancel:hover { background: #e5e7eb; }

/* Paginación */
.pagination-container { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 20px; padding: 16px 0; }
.pagination-info { font-size: 14px; color: #6b7280; }
.pagination-controls { display: flex; align-items: center; gap: 4px; }
.btn-pagination { min-width: 36px; height: 36px; padding: 0 8px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; font-size: 14px; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; }
.btn-pagination:hover:not(.disabled):not(.active) { background: #f3f4f6; border-color: #9ca3af; }
.btn-pagination.active { background: #7c3aed; color: white; border-color: #7c3aed; }
.btn-pagination.disabled { opacity: 0.4; cursor: not-allowed; }
.pagination-ellipsis { padding: 0 4px; color: #9ca3af; font-size: 14px; }

/* Paginación */
.pagination-container { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 20px; padding: 16px 0; }
.pagination-info { font-size: 14px; color: #6b7280; }
.pagination-controls { display: flex; align-items: center; gap: 4px; }
.btn-pagination { min-width: 36px; height: 36px; padding: 0 8px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; font-size: 14px; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; }
.btn-pagination:hover:not(.disabled):not(.active) { background: #f3f4f6; border-color: #9ca3af; }
.btn-pagination.active { background: #7c3aed; color: white; border-color: #7c3aed; }
.btn-pagination.disabled { opacity: 0.4; cursor: not-allowed; }
.pagination-ellipsis { padding: 0 4px; color: #9ca3af; font-size: 14px; }
</style>
