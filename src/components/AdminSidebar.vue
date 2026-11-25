<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { apiNormalized as api } from '../services/apiNormalized';
import { useSidebar } from '../composables/useSidebar';

/**
 * Menú lateral del administrador.
 *
 * Reúne todas las opciones de administración agrupadas por tema. Algunas
 * opciones muestran un número cuando hay algo pendiente (cursos por
 * cerrar, estudiantes listos para promover, estudiantes sin sección).
 */

const route = useRoute();
const { abierto, cerrar, contraido, alternarContraido } = useSidebar();

// Números de pendientes (vienen del mismo resumen que usa el inicio)
const pendientes = ref({
  cierres: 0,
  promociones: 0,
  sinSeccion: 0,
});

const cargarPendientes = async () => {
  try {
    // silencioso: si falla, el menú funciona igual, solo sin números
    const res = await api.get('/admin/dashboard/stats', { silencioso: true });
    const s = res.data || {};
    pendientes.value = {
      cierres: s.pending_closures || 0,
      promociones: s.promotion_eligible || 0,
      sinSeccion: s.unassigned_students || 0,
    };
  } catch {
    // sin números
  }
};

onMounted(cargarPendientes);

// Al volver al inicio se actualizan los números
watch(() => route.path, (ruta) => {
  if (ruta === '/admin') cargarPendientes();
  cerrar(); // en celular, al elegir una opción el menú se cierra
});

// Opciones agrupadas. "badge" indica qué número de pendientes mostrar.
const grupos = [
  {
    titulo: null,
    opciones: [
      { nombre: 'Inicio', ruta: '/admin', icono: '🏠', exacta: true },
    ],
  },
  {
    titulo: 'Personas',
    opciones: [
      { nombre: 'Usuarios', ruta: '/admin/usuarios', icono: '👥', badge: 'sinSeccion', badgeTitulo: 'estudiantes sin sección' },
      { nombre: 'Matrícula', ruta: '/admin/matricula', icono: '📝' },
    ],
  },
  {
    titulo: 'Estructura académica',
    opciones: [
      { nombre: 'Años lectivos', ruta: '/admin/anos-lectivos', icono: '📅' },
      { nombre: 'Grados', ruta: '/admin/grados', icono: '📚' },
      { nombre: 'Secciones', ruta: '/admin/secciones', icono: '🏫' },
      { nombre: 'Materias', ruta: '/admin/materias', icono: '📖' },
      { nombre: 'Horarios', ruta: '/admin/horarios', icono: '⏰' },
    ],
  },
  {
    titulo: 'Fin de año',
    opciones: [
      { nombre: 'Cierre de cursos', ruta: '/admin/cierre-cursos', icono: '🔒', badge: 'cierres', badgeTitulo: 'cursos pendientes de cierre' },
      { nombre: 'Promociones', ruta: '/admin/promociones', icono: '🎓', badge: 'promociones', badgeTitulo: 'estudiantes elegibles' },
    ],
  },
  {
    titulo: 'Sistema',
    opciones: [
      { nombre: 'Registro de actividad', ruta: '/admin/actividad', icono: '📜' },
    ],
  },
];

// ¿La opción corresponde a la pantalla actual?
// (el historial de un estudiante se considera parte de "Usuarios")
const estaActiva = (opcion) => {
  if (opcion.exacta) return route.path === opcion.ruta;
  if (opcion.ruta === '/admin/usuarios' && route.path.startsWith('/admin/students/')) return true;
  return route.path === opcion.ruta || route.path.startsWith(opcion.ruta + '/');
};
</script>

<template>
  <!-- Fondo oscuro detrás del menú abierto en celular -->
  <div
    v-if="abierto"
    class="sidebar-fondo"
    aria-hidden="true"
    @click="cerrar"
  ></div>

  <aside
    id="menu-administracion"
    class="sidebar"
    :class="{ abierto, contraido }"
    @keydown.esc="cerrar"
  >
    <nav aria-label="Menú de administración" class="sidebar-nav">
      <div v-for="(grupo, i) in grupos" :key="i" class="grupo">
        <p v-if="grupo.titulo" class="grupo-titulo">{{ grupo.titulo }}</p>
        <hr v-if="grupo.titulo" class="grupo-separador" aria-hidden="true" />
        <ul>
          <li v-for="opcion in grupo.opciones" :key="opcion.ruta">
            <router-link
              :to="opcion.ruta"
              class="opcion"
              :class="{ activa: estaActiva(opcion) }"
              :aria-current="estaActiva(opcion) ? 'page' : undefined"
              :title="contraido ? opcion.nombre : undefined"
            >
              <span class="opcion-icono" aria-hidden="true">{{ opcion.icono }}</span>
              <span class="opcion-nombre">{{ opcion.nombre }}</span>
              <span
                v-if="opcion.badge && pendientes[opcion.badge] > 0"
                class="opcion-badge"
                :title="`${pendientes[opcion.badge]} ${opcion.badgeTitulo}`"
              >
                {{ pendientes[opcion.badge] }}
                <span class="solo-lector">{{ opcion.badgeTitulo }}</span>
              </span>
            </router-link>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Contraer / expandir (solo en pantallas grandes) -->
    <button
      type="button"
      class="boton-contraer"
      :aria-expanded="contraido ? 'false' : 'true'"
      aria-controls="menu-administracion"
      :title="contraido ? 'Expandir menú' : 'Contraer menú'"
      @click="alternarContraido"
    >
      <span class="boton-contraer-icono" aria-hidden="true">{{ contraido ? '»' : '«' }}</span>
      <span class="opcion-nombre">Contraer menú</span>
      <span v-if="contraido" class="solo-lector">Expandir menú</span>
    </button>
  </aside>
</template>

<style scoped>
.sidebar {
  --sidebar-ancho: 248px;
  position: fixed;
  top: var(--navbar-alto, 64px);
  left: 0;
  bottom: 0;
  width: var(--sidebar-ancho);
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  padding: 16px 12px 12px;
  z-index: 900;
  transition: width 0.2s ease;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ── Menú contraído: solo íconos ─────────────────────────── */
.sidebar.contraido {
  width: 72px;
  padding-left: 10px;
  padding-right: 10px;
}

.grupo-separador {
  display: none;
  border: 0;
  border-top: 1px solid #e5e7eb;
  margin: 0 6px 8px;
}

.sidebar.contraido .grupo-titulo,
.sidebar.contraido .opcion-nombre {
  display: none;
}

.sidebar.contraido .grupo-separador {
  display: block;
}

.sidebar.contraido .opcion {
  justify-content: center;
  position: relative;
  padding: 10px 0;
}

/* El número de pendientes pasa a ser un punto sobre el ícono */
.sidebar.contraido .opcion-badge {
  position: absolute;
  top: 3px;
  right: 6px;
  min-width: 0;
  padding: 0 5px;
  font-size: 10px;
  line-height: 15px;
}

.boton-contraer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding: 9px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  color: #4b5563;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.boton-contraer:hover {
  background: #f3f4f6;
  color: #111827;
}

.boton-contraer:focus-visible {
  outline: 2px solid #047857;
  outline-offset: 2px;
}

.boton-contraer-icono {
  width: 20px;
  text-align: center;
  font-size: 16px;
}

.sidebar.contraido .boton-contraer {
  justify-content: center;
  padding: 9px 0;
}

.grupo + .grupo {
  margin-top: 18px;
}

.grupo-titulo {
  margin: 0 0 6px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b7280;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.opcion {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  color: #374151;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  border-left: 3px solid transparent;
  transition: background 0.15s, color 0.15s;
}

.opcion:hover {
  background: #f3f4f6;
  color: #111827;
}

.opcion:focus-visible {
  outline: 2px solid #047857;
  outline-offset: 2px;
}

.opcion.activa {
  background: #ecfdf5;
  color: #065f46;
  border-left-color: #047857;
  font-weight: 600;
}

.opcion-icono {
  width: 20px;
  text-align: center;
  font-size: 16px;
  flex-shrink: 0;
}

.opcion-nombre {
  flex: 1;
  min-width: 0;
}

.opcion-badge {
  min-width: 22px;
  padding: 1px 7px;
  border-radius: 999px;
  background: #b91c1c;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

/* Texto solo para lectores de pantalla */
.solo-lector {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.sidebar-fondo {
  display: none;
}

/* Celulares y tabletas: el menú se oculta y se abre con el botón ☰ */
@media (max-width: 900px) {
  /* En celular el menú siempre se ve completo y no se contrae */
  .sidebar.contraido {
    width: var(--sidebar-ancho);
    padding-left: 12px;
    padding-right: 12px;
  }

  .sidebar.contraido .grupo-titulo,
  .sidebar.contraido .opcion-nombre {
    display: revert;
  }

  .sidebar.contraido .grupo-separador,
  .boton-contraer {
    display: none;
  }

  .sidebar.contraido .opcion {
    justify-content: flex-start;
    padding: 9px 12px;
  }

  .sidebar.contraido .opcion-badge {
    position: static;
    min-width: 22px;
    padding: 1px 7px;
    font-size: 12px;
    line-height: normal;
  }

  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.12);
    z-index: 1100;
  }

  .sidebar.abierto {
    transform: translateX(0);
  }

  .sidebar-fondo {
    display: block;
    position: fixed;
    inset: var(--navbar-alto, 64px) 0 0 0;
    background: rgba(17, 24, 39, 0.45);
    z-index: 1050;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar {
    transition: none;
  }
}
</style>
