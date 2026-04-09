<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api as apiRaw } from '@/services/apiNormalized';

const router = useRouter();

const props = defineProps({
  participantes: {
    type: Array,
    default: () => []
  },
  loadingParticipantes: Boolean,
  currentUserId: {
    type: Number,
    default: null
  }
});

const selfieUrls = ref({});

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
};

const getBadgeClass = (rol) => {
  if (rol === 'profesor' || rol === 'professor') return 'badge-profesor';
  if (rol === 'estudiante' || rol === 'student') return 'badge-estudiante';
  return '';
};

const goToProfile = (id) => {
  // No navegar si es el propio usuario
  if (id === props.currentUserId) return;
  router.push(`/perfil/${id}`);
};

// Cargar selfie de un usuario
const loadSelfie = async (userId) => {
  if (selfieUrls.value[userId]) return selfieUrls.value[userId];
  
  try {
    const response = await apiRaw.get(`/users/${userId}/selfie`, { 
      responseType: 'blob' 
    });
    if (response.data && response.data.size > 0) {
      const url = URL.createObjectURL(response.data);
      selfieUrls.value[userId] = url;
      return url;
    }
  } catch (e) {
    // No tiene selfie
  }
  return null;
};

// Cargar selfies de todos los participantes
const loadAllSelfies = async () => {
  for (const p of props.participantes) {
    if (p.has_selfie) {
      await loadSelfie(p.id);
    }
  }
};

// Obtener URL de selfie
const getSelfieUrl = (userId) => {
  return selfieUrls.value[userId] || null;
};

// Cargar cuando cambian los participantes
watch(() => props.participantes, loadAllSelfies, { immediate: true });
</script>

<template>
  <section class="participantes-section">
    <div v-if="loadingParticipantes" class="loading">Cargando participantes...</div>
    
    <div v-else-if="participantes.length === 0" class="empty-state">
      <p>No hay participantes disponibles.</p>
    </div>
    
    <div v-else class="participantes-grid">
      <div 
        v-for="participante in participantes" 
        :key="participante.id" 
        :class="['participante-card', { 'es-yo': participante.id === currentUserId }]"
        @click="goToProfile(participante.id)"
      >
        <div class="participante-avatar">
          <img 
            v-if="getSelfieUrl(participante.id)" 
            :src="getSelfieUrl(participante.id)" 
            alt="Avatar"
            class="avatar-img"
          />
          <span v-else>{{ getInitials(participante.nombre) }}</span>
        </div>
        <div class="participante-info">
          <h4 class="participante-nombre">
            {{ participante.nombre }}
            <span v-if="participante.id === currentUserId" class="yo-badge">Tú</span>
          </h4>
          <p class="participante-email">{{ participante.email }}</p>
        </div>
        <span :class="['participante-badge', getBadgeClass(participante.rol)]">
          {{ participante.rol }}
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.participantes-section {
  padding: 0;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #f9fafb;
  border-radius: 12px;
}

.empty-state p {
  color: #6b7280;
  margin-bottom: 16px;
}

.participantes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.participante-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  cursor: pointer;
}

.participante-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
  overflow: hidden;
}

.participante-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.participante-info {
  flex: 1;
  min-width: 0;
}

.participante-nombre {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.participante-email {
  margin: 4px 0 0;
  font-size: 13px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.participante-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
  flex-shrink: 0;
}

.badge-profesor {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-estudiante {
  background: #d1fae5;
  color: #059669;
}
</style>
