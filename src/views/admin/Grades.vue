<script setup>
import { ref, onMounted } from 'vue';
import api from '../../services/api';

const grades = ref([]);
const loading = ref(true);
const error = ref('');
const showModal = ref(false);
const editingItem = ref(null);

const form = ref({
  name: '',
  order: ''
});

const fetchData = async () => {
  loading.value = true;
  try {
    const gradesRes = await api.get('/grades');
    grades.value = gradesRes.data.data || gradesRes.data;
  } catch (e) {
    error.value = 'Error al cargar grados';
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const openModal = (item = null) => {
  editingItem.value = item;
  if (item) {
    form.value = { name: item.name, order: item.order || '' };
  } else {
    form.value = { name: '', order: '' };
  }
  showModal.value = true;
};

const closeModal = () => { showModal.value = false; editingItem.value = null; };

const saveItem = async () => {
  try {
    const data = { name: form.value.name };
    // Solo enviar order si tiene valor numérico
    if (form.value.order !== '' && form.value.order !== null) {
      data.order = parseInt(form.value.order, 10);
    }

    if (editingItem.value) {
      await api.put(`/grades/${editingItem.value.id}`, data);
    } else {
      await api.post('/grades', data);
    }
    await fetchData();
    closeModal();
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al guardar';
  }
};

const deleteItem = async (id) => {
  if (!confirm('¿Eliminar este grado?')) return;
  try {
    await api.delete(`/grades/${id}`);
    await fetchData();
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al eliminar';
  }
};

const getOrderLabel = (order) => {
  if (order === null || order === undefined || order === '') return '—';
  return `#${order}`;
};

onMounted(fetchData);
</script>

<template>
  <div class="grades-view">
    <div class="page-header">
      <h2>Grados</h2>
      <button @click="openModal()" class="btn-primary">+ Nuevo Grado</button>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="loading" class="loading">Cargando...</div>

    <table v-else class="data-table">
      <thead>
        <tr>
          <th>Orden</th>
          <th>Nombre</th>
          <th>Secciones</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in grades" :key="item.id">
          <td class="order-cell">{{ getOrderLabel(item.order) }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.sections?.length || 0 }} secciones</td>
          <td>
            <button @click="openModal(item)" class="btn-primary btn-sm">Editar</button>
            <button @click="deleteItem(item.id)" class="btn-danger btn-sm">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingItem ? 'Editar' : 'Nuevo' }} Grado</h3>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="saveItem" class="modal-body">
          <div class="form-group">
            <label>Nombre *</label>
            <input v-model="form.name" required placeholder="ej: Primero, Segundo, Tercero" />
            <small class="form-help">El grado es un concepto genérico (no ligado a un año lectivo)</small>
          </div>
          <div class="form-group">
            <label>Orden (opcional)</label>
            <input v-model.number="form.order" type="number" min="1" placeholder="ej: 1, 2, 3..." />
            <small class="form-help">Define la secuencia del grado. Usado para promoción automática.</small>
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


