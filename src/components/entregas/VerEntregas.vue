<template>
  <div class="ver-entregas">
    <div v-if="!tarea" class="alert alert-warning">
      Tarea no encontrada
    </div>
    
    <div v-else>
      <h3>Entregas para: {{ tarea.titulo }}</h3>
      
      <div v-if="entregas.length === 0" class="alert alert-info">
        No hay entregas para esta tarea todavía.
      </div>
      
      <div v-else class="table-responsive">
        <table class="table table-striped table-hover">
          <thead class="table-light">
            <tr>
              <th>#</th>
              <th>Estudiante</th>
              <th>Archivo</th>
              <th>Fecha de entrega</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(entrega, index) in entregas" :key="entrega.id">
              <td>{{ index + 1 }}</td>
              <td>
                {{ entrega.estudiante.first_name }} {{ entrega.estudiante.last_name }}
                <br>
                <small class="text-muted">{{ entrega.estudiante.email }}</small>
              </td>
              <td>
                <a 
                  :href="entrega.download_url" 
                  target="_blank" 
                  class="btn btn-sm btn-outline-primary"
                >
                  Ver archivo
                </a>
              </td>
              <td>{{ formatDate(entrega.fecha_entrega) }}</td>
              <td>
                <button 
                  @click="descargarEntrega(entrega.id)" 
                  class="btn btn-sm btn-outline-success"
                >
                  Descargar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';
import EntregaService from '@/services/EntregaService';

const { isAuthenticated, user } = useAuth();
const props = defineProps({
  tareaId: {
    type: Number,
    required: true
  }
});

const tarea = ref(null);
const entregas = ref([]);
const isLoading = ref(false);
const error = ref('');

const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const cargarTarea = async () => {
  try {
    // Intentamos obtener la tarea (esto dependerá de cómo esté estructurado el API)
    // Por ahora asumimos que la tareaId es válida
    tarea.value = { id: props.tareaId, titulo: `Tarea #${props.tareaId}` };
    await cargarEntregas();
  } catch (err) {
    console.error('Error al cargar tarea:', err);
    tarea.value = null;
    error.value = 'Error al cargar la tarea';
  }
};

const cargarEntregas = async () => {
  isLoading.value = true;
  error.value = '';
  
  try {
    const response = await EntregaService.obtenerEntregasTarea(props.tareaId);
    
    // El backend devuelve { data: [...] }
    if (response.data && response.data.data) {
      entregas.value = response.data.data.map(entrega => ({
        ...entrega,
        download_url: entrega.archivo_url || `${import.meta.env.VITE_API_URL || ''}/storage/${entrega.archivo}`
      }));
    } else if (response.data && response.data.message) {
      error.value = response.data.message;
    }
  } catch (err) {
    console.error('Error al obtener entregas:', err);
    if (err.response?.data?.message) {
      error.value = err.response.data.message;
    } else {
      error.value = 'Error al obtener las entregas. Por favor intenta de nuevo.';
    }
  } finally {
    isLoading.value = false;
  }
};

const descargarEntrega = async (entregaId) => {
  try {
    const response = await EntregaService.descargarEntrega(entregaId);
    if (response.data && response.data.download_url) {
      // Abrir la URL de descarga en una nueva pestaña
      window.open(response.data.download_url, '_blank');
    }
  } catch (err) {
    console.error('Error al descargar:', err);
    alert('Error al descargar el archivo');
  }
};

// Inicialización
cargarTarea();
</script>

<style scoped>
.ver-entregas {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.ver-entregas h3 {
  color: #495057;
  margin-bottom: 20px;
  text-align: center;
}

.table-responsive {
  margin-top: 20px;
}
</style>