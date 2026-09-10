<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { apiNormalized as api } from '../services/apiNormalized';

const router = useRouter();
const { user, fetchUser } = useAuth();
const loading = ref(true);
const error = ref(false);

// Métricas del dashboard
const stats = ref({
  active_students: 0,
  active_teachers: 0,
  pending_closures: 0,
  approval_rate: null,
  approved_count: 0,
  closed_count: 0,
  full_sections: 0,
  total_sections: 0,
  total_grades: 0,
  active_school_year: '',
  active_school_year_id: null,
  unassigned_students: 0,
  promotion_eligible: 0,
});

onMounted(async () => {
  if (!user.value) {
    await fetchUser();
  }
  await fetchStats();
});

const fetchStats = async () => {
  try {
    loading.value = true;
    error.value = false;
    const res = await api.get('/admin/dashboard/stats');
    stats.value = res.data || {};
  } catch (e) {
    console.error('Error fetching dashboard stats:', e);
    error.value = true;
  } finally {
    loading.value = false;
  }
};

// ─── Cards de métricas (clickables con drill-down) ─────────────
const metricCards = computed(() => [
  {
    label: 'Estudiantes Activos',
    value: stats.value.active_students,
    icon: '🎓',
    color: 'green',
    link: '/admin/usuarios',
    linkQuery: '?role=estudiante&activo=1',
  },
  {
    label: 'Profesores Activos',
    value: stats.value.active_teachers,
    icon: '👨‍🏫',
    color: 'blue',
    link: '/admin/usuarios',
    linkQuery: '?role=profesor&activo=1',
  },
  {
    label: 'Cursos Pendientes',
    value: stats.value.pending_closures,
    icon: '⏳',
    color: stats.value.pending_closures > 0 ? 'red' : 'green',
    link: '/admin/actividad',
    linkQuery: '',
  },
  {
    label: 'Tasa de Aprobación',
    value: stats.value.approval_rate !== null ? `${stats.value.approval_rate}%` : '—',
    icon: '📊',
    color: stats.value.approval_rate >= 70 ? 'green' : stats.value.approval_rate !== null ? 'yellow' : 'gray',
    link: null,
    linkQuery: '',
  },
  {
    label: 'Secciones al 90%+',
    value: stats.value.full_sections,
    icon: '🏫',
    color: stats.value.full_sections > 0 ? 'red' : 'green',
    link: '/admin/secciones',
    linkQuery: '',
  },
  {
    label: 'Sin Sección',
    value: stats.value.unassigned_students,
    icon: '⚠️',
    color: stats.value.unassigned_students > 0 ? 'yellow' : 'green',
    link: '/admin/usuarios',
    linkQuery: '?unassigned=1',
  },
]);

// ─── Alertas del sistema ────────────────────────────────────────
const alerts = computed(() => {
  const items = [];
  if (stats.value.pending_closures > 0) {
    items.push({
      type: 'warning',
      icon: '⏳',
      message: `${stats.value.pending_closures} curso${stats.value.pending_closures > 1 ? 's' : ''} pendiente${stats.value.pending_closures > 1 ? 's' : ''} de cierre`,
      link: '/admin/actividad',
    });
  }
  if (stats.value.full_sections > 0) {
    items.push({
      type: 'danger',
      icon: '🚨',
      message: `${stats.value.full_sections} seccion${stats.value.full_sections > 1 ? 'es' : ''} al 90%+ de capacidad`,
      link: '/admin/secciones',
    });
  }
  if (stats.value.unassigned_students > 0) {
    const ids = stats.value.unassigned_student_ids || [];
    items.push({
      type: 'info',
      icon: '📋',
      message: `${stats.value.unassigned_students} estudiante${stats.value.unassigned_students > 1 ? 's' : ''} sin sección asignada`,
      link: ids.length === 1 ? `/admin/usuarios?unassigned=1` : '/admin/usuarios?unassigned=1',
    });
  }
  if (stats.value.promotion_eligible > 0) {
    const ids = stats.value.promotion_eligible_ids || [];
    items.push({
      type: 'success',
      icon: '🎉',
      message: `${stats.value.promotion_eligible} estudiante${stats.value.promotion_eligible > 1 ? 's' : ''} elegible${stats.value.promotion_eligible > 1 ? 's' : ''} para promoción`,
      link: ids.length === 1 ? `/admin/students/${ids[0]}/history` : '/admin/usuarios?eligible=1',
    });
  }
  return items;
});

const navigateTo = (card) => {
  if (!card.link) return;
  router.push(card.link + card.linkQuery);
};

// ─── Navegación existente (mantener compatibilidad) ─────────────
const primaryItems = [
  { name: 'Usuarios', path: '/admin/usuarios', icon: '👥', description: 'Estudiantes y Profesores', count: computed(() => stats.value.active_students + stats.value.active_teachers) },
];

const secondaryItems = [
  { name: 'Secciones', path: '/admin/secciones', icon: '🏫', description: 'Gestionar secciones', count: computed(() => stats.value.total_sections) },
  { name: 'Horarios', path: '/admin/horarios', icon: '⏰', description: 'Gestionar horarios', count: ref(0) },
];

const tertiaryItems = [
  { name: 'Matrícula', path: '/admin/matricula', icon: '📝', description: 'Matricular estudiantes', count: null },
  { name: 'Cierre de Cursos', path: '/admin/cierre-cursos', icon: '🔒', description: 'Cerrar cursos pendientes', count: null },
  { name: 'Promociones', path: '/admin/promociones', icon: '🎓', description: 'Promover estudiantes', count: computed(() => stats.value.promotion_eligible) },
  { name: 'Años Lectivos', path: '/admin/anos-lectivos', icon: '📅', description: 'Gestionar años escolares', count: computed(() => stats.value.total_school_years || 0) },
  { name: 'Grados', path: '/admin/grados', icon: '📚', description: 'Gestionar grados', count: computed(() => stats.value.total_grades) },
  { name: 'Materias', path: '/admin/materias', icon: '📖', description: 'Gestionar materias', count: computed(() => stats.value.total_subjects || 0) },
  { name: 'Actividad', path: '/admin/actividad', icon: '📜', description: 'Registro de acciones', count: computed(() => stats.value.total_activity_logs || 0) },
];
</script>

<template>
  <div class="dashboard">

    <!-- Año lectivo activo -->
    <div v-if="stats.active_school_year" class="active-year-banner">
      <span class="year-icon">📅</span>
      <span class="year-text">Año lectivo activo:</span>
      <strong>{{ stats.active_school_year }}</strong>
    </div>

    <!-- Alertas del sistema -->
    <div v-if="alerts.length > 0" class="alerts-section">
      <h3 class="alerts-title">⚠️ Alertas del sistema</h3>
      <div class="alerts-list">
        <div
          v-for="(alert, i) in alerts"
          :key="i"
          class="alert-item"
          :class="alert.type"
          @click="alert.link ? $router.push(alert.link) : null"
          :style="{ cursor: alert.link ? 'pointer' : 'default' }"
        >
          <span class="alert-icon">{{ alert.icon }}</span>
          <span class="alert-message">{{ alert.message }}</span>
          <span v-if="alert.link" class="alert-arrow">→</span>
        </div>
      </div>
    </div>

    <!-- Tarjetas de navegación (primero) -->
    <div class="nav-cards-section">
      <div class="nav-cards-grid">
      <!-- Sección principal -->
      <router-link
        v-for="item in primaryItems"
        :key="item.path"
        :to="item.path"
        class="nav-card"
        active-class="active"
      >
        <span class="nav-card-icon">{{ item.icon }}</span>
        <div class="nav-card-text">
          <span class="nav-card-name">{{ item.name }}</span>
          <span class="nav-card-desc">{{ item.description }}</span>
        </div>
        <div v-if="item.count?.value !== null" class="nav-card-badge">{{ item.count }}</div>
      </router-link>

      <!-- Sección secundaria -->
      <router-link
        v-for="item in secondaryItems"
        :key="item.path"
        :to="item.path"
        class="nav-card"
        active-class="active"
      >
        <span class="nav-card-icon">{{ item.icon }}</span>
        <div class="nav-card-text">
          <span class="nav-card-name">{{ item.name }}</span>
          <span class="nav-card-desc">{{ item.description }}</span>
        </div>
        <div v-if="item.count?.value !== null" class="nav-card-badge">{{ item.count }}</div>
      </router-link>

      <!-- Sección terciaria -->
      <router-link
        v-for="item in tertiaryItems"
        :key="item.path"
        :to="item.path"
        class="nav-card"
        active-class="active"
      >
        <span class="nav-card-icon">{{ item.icon }}</span>
        <div class="nav-card-text">
          <span class="nav-card-name">{{ item.name }}</span>
          <span class="nav-card-desc">{{ item.description }}</span>
        </div>
        <div v-if="item.count?.value !== null" class="nav-card-badge">{{ item.count }}</div>
      </router-link>
    </div>
    </div>

    <!-- Cards de métricas (después) -->
    <div class="metrics-grid">
      <div
        v-for="(card, i) in metricCards"
        :key="i"
        class="metric-card"
        :class="[card.color, { clickable: card.link }]"
        @click="navigateTo(card)"
      >
        <span class="metric-icon">{{ card.icon }}</span>
        <div class="metric-info">
          <span class="metric-value">{{ card.value }}</span>
          <span class="metric-label">{{ card.label }}</span>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-if="error" class="error-fallback">
      <p>No se pudieron cargar las métricas del dashboard.</p>
      <button @click="fetchStats" class="btn-retry">Reintentar</button>
    </div>

    <main class="main-content">
      <router-view />
    </main>

  </div>
</template>

<style scoped>
/* ─── Año lectivo activo ────────────────────────────────── */
.active-year-banner {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 12px 20px;
  margin-top: 24px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #166534;
}

.year-icon { font-size: 18px; }
.year-text { opacity: 0.8; }

/* ─── Alertas ───────────────────────────────────────────── */
.alerts-section {
  margin-top: 24px;
  padding: 0 24px;
}

.alerts-title {
  font-size: 16px;
  color: #374151;
  margin: 0 0 12px;
  font-weight: 600;
}

/* ─── Tarjetas de navegación unificadas ──────────────────────── */
.nav-cards-section {
  padding: 0 24px;
  margin-bottom: 40px;
  margin-top: 32px;
}

.nav-cards-header {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px;
}

.nav-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.nav-cards-header {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px;
}

.nav-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  padding: 0 24px 24px;
}

.nav-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: white;
  border-radius: 16px;
  text-decoration: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.25s ease;
  min-height: 100px;
  border-left: 5px solid #10b981;
}

.nav-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.nav-card.active {
  border: 2px solid #10b981;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.nav-card-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.nav-card-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.nav-card-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.nav-card-desc {
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
}

.nav-card-badge {
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  min-width: 28px;
  text-align: center;
}

.alert-item.success {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #166534;
}

.alert-icon { font-size: 18px; }
.alert-message { flex: 1; font-size: 14px; font-weight: 500; }
.alert-arrow { font-size: 16px; opacity: 0.5; }

/* ─── Métricas ──────────────────────────────────────────── */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 40px;
  padding: 0 24px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 28px;
  border-radius: 16px;
  border: none;
  background: white;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  min-height: 110px;
}

.metric-card.clickable {
  cursor: pointer;
}

.metric-card.clickable:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
}

.metric-card.green { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-left: 5px solid #10b981; }
.metric-card.blue { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 5px solid #3b82f6; }
.metric-card.red { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-left: 5px solid #ef4444; }
.metric-card.yellow { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-left: 5px solid #f59e0b; }
.metric-card.gray { background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-left: 5px solid #9ca3af; }

.metric-icon { 
  font-size: 32px; 
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  min-width: 0;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
  white-space: nowrap;
}

.metric-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
}

/* ─── Error fallback ────────────────────────────────────── */
.error-fallback {
  text-align: center;
  padding: 20px;
  color: #6b7280;
}

.btn-retry {
  margin-top: 8px;
  padding: 8px 20px;
  background: #7c3aed;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-retry:hover { background: #6d28d9; }
</style>