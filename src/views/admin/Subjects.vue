<script setup>
import { ref, onMounted } from 'vue';
import api from '../../services/api';

const subjects = ref([]);
const loading = ref(true);
const error = ref('');
const showModal = ref(false);
const editingItem = ref(null);

const form = ref({ name: '' });

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await api.get('/subjects');
    subjects.value = res.data.data || res.data;
  } catch (e) {
    error.value = 'Error al cargar materias';
  } finally {
    loading.value = false;
  }
};

const openModal = (item = null) => {
  editingItem.value = item;
  form.value = item ? { name: item.name } : { name: '' };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingItem.value = null;
};

const saveItem = async () => {
  try {
    if (editingItem.value) {
      await api.put(`/subjects/${editingItem.value.id}`, form.value);
    } else {
      await api.post('/subjects', form.value);
    }
    await fetchData();
    closeModal();
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al guardar';
  }
};

const deleteItem = async (id) => {
  if (!confirm('¿Eliminar esta materia?')) return;
  try {
    await api.delete(`/subjects/${id}`);
    await fetchData();
  } catch (e) {
    error.value = e.response?.data?.message || 'Error';
  }
};

onMounted(fetchData);
</script>

<template>
  <div class="subjects-view">
    <div class="page-header">
      <h2>Materias</h2>
      <button @click="openModal()" class="btn-primary">+ Nueva Materia</button>
    </div>
    
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="loading" class="loading">Cargando...</div>
    
    <div v-else class="cards-grid">
      <div v-for="item in subjects" :key="item.id" class="card">
        <div class="card-header">
          <h3>{{ item.name }}</h3>
        </div>
        <div class="card-footer">
          <button @click="openModal(item)" class="btn-primary btn-sm">Editar</button>
          <button @click="deleteItem(item.id)" class="btn-danger btn-sm">Eliminar</button>
        </div>
      </div>
    </div>
    
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingItem ? 'Editar' : 'Nueva' }} Materia</h3>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="saveItem" class="modal-body">
          <div class="form-group">
            <label>Nombre *</label>
            <input v-model="form.name" required placeholder="ej: Matemáticas" />
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
