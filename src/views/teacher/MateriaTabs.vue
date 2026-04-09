<script setup>
const props = defineProps({
  participantes: Array,
  loadingParticipantes: Boolean
});

const emit = defineEmits([]);

const getIniciales = (nombre) => {
  if (!nombre) return '?';
  return nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};
</script>

<template>
  <section class="participantes-section">
    <div class="section-header">
      <h2 class="section-title">Participantes</h2>
    </div>
    
    <div v-if="loadingParticipantes" class="loading">Cargando participantes...</div>
    
    <div v-else-if="participantes.length === 0" class="empty-state">
      <p>No hay participantes en esta materia</p>
    </div>
    
    <div v-else class="participantes-grid">
      <div 
        v-for="participante in participantes" 
        :key="participante.id" 
        class="participante-card"
      >
        <div class="participante-avatar">
          {{ getIniciales(participante.nombre) }}
        </div>
        <div class="participante-info">
          <h3 class="participante-nombre">{{ participante.nombre }}</h3>
          <p class="participante-email">{{ participante.email }}</p>
          <span class="participante-rol">
            {{ participante.rol === 'profesor' ? 'Profesor' : 'Estudiante' }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.participantes-section {
  padding: 24px;
}

.section-header {
  margin-bottom: 24px;
}

.section-title {
  font-size: 20px;
  color: #1e293b;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #64748b;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #f8fafc;
  border-radius: 12px;
}

.empty-state p {
  color: #64748b;
}

.participantes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.participante-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: box-shadow 0.2s;
}

.participante-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.participante-avatar {
  width: 48px;
  height: 48px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
}

.participante-info {
  flex: 1;
}

.participante-nombre {
  margin: 0;
  font-size: 16px;
  color: #1e293b;
}

.participante-email {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #64748b;
}

.participante-rol {
  display: inline-block;
  margin-top: 8px;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  background: #dbeafe;
  color: #1e40af;
}
</style>
