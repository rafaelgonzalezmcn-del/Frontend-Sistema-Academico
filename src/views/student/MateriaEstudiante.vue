<template>
  <div class="materia-estudiante">
    <!-- Header -->
    <div class="page-header">
      <button class="btn-back" @click="volver">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        Volver
      </button>
      <div class="header-info">
        <h1>{{ materia?.name || 'Cargando...' }}</h1>
        <p class="subtitle" v-if="materia">
          {{ materia.section?.grade }} - {{ materia.section?.name }}
        </p>
      </div>
    </div>

    <!-- Mensaje de Error -->
    <div v-if="error" class="error-message">
      {{ error }}
      <button class="close-error" @click="error = ''">&times;</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      Cargando materia...
    </div>

    <div v-else>
      <!-- Tabs -->
      <div class="tabs-container">
        <button 
          :class="['tab-button', { active: tabActiva === 'curso' }]"
          @click="tabActiva = 'curso'"
        >
          📘 Curso
        </button>
        <button 
          :class="['tab-button', { active: tabActiva === 'participantes' }]"
          @click="tabActiva = 'participantes'"
        >
          👥 Participantes
        </button>
        <button 
          :class="['tab-button', { active: tabActiva === 'notas' }]"
          @click="tabActiva = 'notas'"
        >
          📝 Notas
        </button>
        <button 
          :class="['tab-button', { active: tabActiva === 'tareas' }]"
          @click="tabActiva = 'tareas'"
        >
          📋 Tareas
        </button>
      </div>

      <!-- Tab: Curso -->
      <div v-if="tabActiva === 'curso'" class="curso-section">
        <div v-if="modulos.length > 0" class="modules-grid">
          <div 
            v-for="modulo in modulos" 
            :key="modulo.id" 
            class="module-card"
            :id="'modulo-' + modulo.id"
          >
            <div class="module-header">
              <div class="view-mode">
                <button 
                  class="toggle-btn"
                  @click="toggleModulo(modulo.id)"
                >
                  <span class="toggle-arrow" :class="{ collapsed: modulosColapsados[modulo.id] }">▼</span>
                </button>
                <div class="module-title-section">
                  <h3 class="module-title">
                    📦 {{ modulo.nombre }}
                    <span class="material-count">({{ modulo.materiales?.length || 0 }} archivos, {{ modulo.tareas?.length || 0 }} tareas)</span>
                  </h3>
                  <p v-if="modulo.descripcion" class="module-description">
                    {{ modulo.descripcion }}
                  </p>
                </div>
              </div>
            </div>
  
            <!-- Lista de materiales (colapsable) -->
            <div :class="['module-content', { 'content-collapsed': modulosColapsados[modulo.id] }]">
              <div class="materials-list">
                <div 
                  v-for="material in modulo.materiales" 
                  :key="material.id" 
                  class="material-item"
                  @click="verPDF(material)"
                >
                  <div class="material-info">
                    <div class="material-main">
                      <span class="material-icon">📄</span>
                      <span class="material-name">{{ material.nombre_archivo }}</span>
                    </div>
                    <div v-if="material.descripcion" class="material-descripcion">
                      {{ material.descripcion }}
                    </div>
                  </div>
                  <div class="material-size">{{ formatFileSize(material.tamano) }}</div>
                </div>
  
                <div v-if="!modulo.materiales || modulo.materiales.length === 0" class="no-materials">
                  No hay materiales disponibles
                </div>
              </div>
              
              <!-- Lista de tareas -->
              <div v-if="modulo.tareas && modulo.tareas.length > 0" class="tareas-list">
                <div 
                  v-for="tarea in modulo.tareas" 
                  :key="tarea.id" 
                  class="tarea-card"
                >
                  <div class="tarea-card-header">
                    <span class="tarea-icon">📝</span>
                    <span class="tarea-title">{{ tarea.titulo }}</span>
                  </div>
                  <div class="tarea-card-body">
                    <div class="tarea-info-row">
                      <span class="tarea-fecha">📅 Límite: {{ formatDate(tarea.fecha_limite) }}</span>
                    </div>
                    <div class="tarea-status">
                      <span v-if="tarea.ha_entregado && tarea.mi_entrega?.nota" class="tarea-nota">Calificación: {{ tarea.mi_entrega.nota }}/{{ tarea.puntaje_maximo }}</span>
                      <span v-else-if="tarea.ha_entregado" class="badge badge-success">✓ Entregado</span>
                      <span v-else class="badge badge-warning">⏳ Pendiente</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <div v-else class="empty-state">
          <p>No hay módulos disponibles para esta materia.</p>
        </div>
      </div>

      <!-- Tab: Participantes -->
      <div v-if="tabActiva === 'participantes'" class="participantes-section">
        <div v-if="participantes.length > 0" class="participantes-grid">
          <div 
            v-for="participante in participantes" 
            :key="participante.id" 
            :class="['participante-card', { 'es-yo': participante.id === user?.id }]"
            @click="verPerfil(participante.id)"
          >
            <div class="participante-avatar">
              <img v-if="getSelfieUrl(participante.id)" :src="getSelfieUrl(participante.id)" alt="Avatar" class="avatar-img" />
              <span v-else>{{ getIniciales(participante.nombre) }}</span>
            </div>
            <div class="participante-info">
              <h4 class="participante-nombre">
                {{ participante.nombre }}
                <span v-if="participante.id === user?.id" class="yo-badge">Tú</span>
              </h4>
              <p class="participante-email">{{ participante.email }}</p>
            </div>
            <span :class="['participante-badge', getBadgeClass(participante.rol)]">
              {{ participante.rol }}
            </span>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>No hay participantes disponibles.</p>
        </div>
      </div>

      <!-- Tab: Notas - Usando componente compartido -->
      <NotasSection 
        v-if="tabActiva === 'notas'" 
        :modulos="modulos"
        :materia-id="materiaId"
        mode="estudiante"
        :estudiante-id="user?.id"
      />

      <!-- Tab: Tareas - Usando componente compartido -->
      <TareasSection 
        v-if="tabActiva === 'tareas'" 
        :modulos="modulos"
        :materia-id="materiaId"
        mode="estudiante"
      />
    </div>
  
    <!-- Visor de PDF - Usando componente compartido -->
    <PdfViewerModal
      v-if="pdfSeleccionado"
      :show="!!pdfSeleccionado"
      :pdf-url="pdfSeleccionado?.url"
      :title="pdfSeleccionado?.nombre_archivo"
      @update:show="pdfSeleccionado = null"
      @close="pdfSeleccionado = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { apiNormalized, api as apiRaw } from '@/services/apiNormalized';
import { formatFileSize, getIniciales } from '@/utils/formatters';

// Componentes compartidos
import NotasSection from '@/views/shared/components/notas/NotasSection.vue';
import TareasSection from '@/views/shared/components/tareas/TareasSection.vue';
import PdfViewerModal from '@/views/shared/components/modals/PdfViewerModal.vue';

const { user } = useAuth();
const route = useRoute();
const router = useRouter();

// Estados
const loading = ref(true);
const error = ref('');
const materia = ref(null);
const modulos = ref([]);
const participantes = ref([]);
const tabActiva = ref('curso');
const modulosColapsados = ref({});
const pdfSeleccionado = ref(null);

// Selfies de participantes
const selfieUrls = ref({});

// Cargar selfie de un usuario
const loadSelfie = async (userId) => {
  if (selfieUrls.value[userId]) return;
  try {
    const response = await apiRaw.get(`/users/${userId}/selfie`, { 
      responseType: 'blob' 
    });
    if (response.data && response.data.size > 0) {
      selfieUrls.value[userId] = URL.createObjectURL(response.data);
    }
  } catch (e) {
    // No tiene selfie
  }
};

// Cargar todas las selfies
const loadAllSelfies = async () => {
  for (const p of participantes.value) {
    if (p.has_selfie) {
      await loadSelfie(p.id);
    }
  }
};

const getSelfieUrl = (userId) => selfieUrls.value[userId] || null;

// Observer cambios en participantes
watch(participantes, loadAllSelfies, { immediate: true });

// ID reactivo de la materia
const materiaId = computed(() => route.params.id);

// getIniciales importado desde formatters.js
const getBadgeClass = (rol) => {
  if (rol === 'profesor' || rol === 'professor') return 'badge-profesor';
  if (rol === 'estudiante' || rol === 'student') return 'badge-estudiante';
  return '';
};

const toggleModulo = (moduloId) => {
  modulosColapsados.value[moduloId] = !modulosColapsados.value[moduloId];
};

const verPDF = async (material) => {
  try {
    // Usar api raw (no normalizado) para descargas
    const response = await api.get(`/materiales/${material.id}/descargar`);
    if (response.data.download_url) {
      const url = response.data.download_url;
      const filename = response.data.filename || material.nombre_archivo;
      
      // Si es ZIP, descargar directamente
      if (filename.toLowerCase().endsWith('.zip')) {
        window.open(url, '_blank');
        return;
      }
      
      // Si es PDF, abrir en visor embebido
      pdfSeleccionado.value = {
        ...material,
        url: url
      };
    }
  } catch (err) {
    error.value = 'Error al cargar el archivo';
  }
};

const volver = () => {
  router.push('/estudiante');
};

const verPerfil = (id) => {
  // Si es el propio usuario, no ir a su perfil (ya está ahí)
  if (id === user.value?.id) return;
  router.push(`/perfil/${id}`);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Fetch functions
const fetchMateria = async () => {
  if (!materiaId.value) return;
  try {
    // El servicio ahora devuelve respuesta normalizada
    const response = await apiNormalized.get(`/subjects/${materiaId.value}`);
    materia.value = response.data;
  } catch (err) {
    error.value = 'Error al cargar la materia';
  }
};

const fetchModulos = async () => {
  if (!materiaId.value) return;
  try {
    // Cargar módulos
    const response = await apiNormalized.get(`/materias/${materiaId.value}/modulos`);
    modulos.value = response.data || [];
    
    // Cargar tareas para cada módulo
    for (const modulo of modulos.value) {
      try {
        const tareasResponse = await apiNormalized.get(`/modulos/${modulo.id}/tareas`);
        modulo.tareas = tareasResponse.data || [];
      } catch (e) {
        modulo.tareas = [];
      }
    }
  } catch (err) {
    modulos.value = [];
  }
};

const fetchParticipantes = async () => {
  if (!materiaId.value) return;
  try {
    // El servicio ahora devuelve respuesta normalizada
    const response = await apiNormalized.get(`/subjects/${materiaId.value}/participantes`);
    participantes.value = response.data || [];
  } catch (err) {
    participantes.value = [];
  }
};

// Cargar datos al inicio
onMounted(async () => {
  await Promise.all([
    fetchMateria(),
    fetchModulos(),
    fetchParticipantes()
  ]);
  loading.value = false;
});
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #f8fafc;
  border-radius: 12px;
}

.empty-state p {
  color: #94a3b8;
}

.tareas-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tarea-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tarea-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.tarea-nota {
  font-weight: 600;
  color: #166534;
  background: #dcfce7;
  padding: 4px 8px;
  border-radius: 4px;
}

.tarea-card.tarea-seleccionada {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 0 0 2px #3b82f6;
}

.tarea-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.tarea-icon {
  font-size: 16px;
}

.tarea-title {
  font-weight: 600;
  color: #1e293b;
}

.tarea-card-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tarea-info-row {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #64748b;
}

.tarea-status {
  font-size: 12px;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.badge-success {
  background: #dcfce7;
  color: #166534;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}
</style>
