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
    link: '/admin/cierre-cursos',
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
      link: '/admin/cierre-cursos',
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

// La navegación está en el menú lateral (components/AdminSidebar.vue)
</script>

<template>
  <div class="panel-inicio">
    <header class="dashboard-header">
      <h1>Panel principal</h1>
      <p>Resumen del año lectivo y tareas pendientes</p>
    </header>

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
          :role="alert.link ? 'link' : undefined"
          :tabindex="alert.link ? 0 : undefined"
          @click="alert.link ? $router.push(alert.link) : null"
          @keydown.enter="alert.link ? $router.push(alert.link) : null"
          :style="{ cursor: alert.link ? 'pointer' : 'default' }"
        >
          <span class="alert-icon">{{ alert.icon }}</span>
          <span class="alert-message">{{ alert.message }}</span>
          <span v-if="alert.link" class="alert-arrow">→</span>
        </div>
      </div>
    </div>

    <!-- Métricas -->
    <h2 class="seccion-titulo">Indicadores</h2>
    <div class="metrics-grid">
      <div
        v-for="(card, i) in metricCards"
        :key="i"
        class="metric-card"
        :class="[card.color, { clickable: card.link }]"
        :role="card.link ? 'link' : undefined"
        :tabindex="card.link ? 0 : undefined"
        @click="navigateTo(card)"
        @keydown.enter="navigateTo(card)"
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

  </div>
</template>

<style scoped>
/* ─── Contenedor y encabezado ───────────────────────────── */
/* Ocupa todo el ancho junto al menú (antes usaba la clase global
   .dashboard, que lo centraba con otro fondo y dejaba un espacio vacío) */
.panel-inicio {
  max-width: 1400px;
  padding: 24px 32px 40px;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.dashboard-header p {
  margin: 4px 0 0;
  font-size: 14px;
  color: #4b5563;
}

.seccion-titulo {
  margin: 28px 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.alert-item:focus-visible,
.metric-card:focus-visible {
  outline: 2px solid #047857;
  outline-offset: 2px;
}

@media (max-width: 600px) {
  .panel-inicio {
    padding: 16px;
  }
}

/* ─── Año lectivo activo ────────────────────────────────── */
.active-year-banner {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 12px 20px;
  margin-top: 20px;
  margin-bottom: 8px;
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
}

.alerts-title {
  font-size: 16px;
  color: #374151;
  margin: 0 0 12px;
  font-weight: 600;
}

/* ─── Métricas ──────────────────────────────────────────── */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 0;
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