<script setup>
import { useSidebar } from '../composables/useSidebar';

/**
 * Menú lateral del aula de un curso (vista del profesor).
 *
 * Tiene el mismo aspecto y comportamiento que el menú del administrador:
 * fijo a la izquierda, contraíble a solo íconos y, en celular, se abre
 * con el botón ☰ de la barra superior.
 *
 * Muestra el índice del curso: cada módulo con sus tareas. Al hacer clic
 * se emite "ir-a" y el aula baja hasta ese módulo o tarea.
 */

defineProps({
  titulo: { type: String, default: '' },
  subtitulo: { type: String, default: '' },
  modulos: { type: Array, default: () => [] },
  tareas: { type: Object, default: () => ({}) },   // { moduloId: [tareas] }
  moduloVisible: { type: Number, default: null },  // módulo que se está viendo
});

const emit = defineEmits(['ir-a', 'volver']);

const { abierto, cerrar, contraido, alternarContraido } = useSidebar();

const irA = (tipo, id, moduloId) => {
  emit('ir-a', tipo, id, moduloId);
  cerrar(); // en celular, al elegir una opción el menú se cierra
};
</script>

<template>
  <!-- Fondo oscuro detrás del menú abierto en celular -->
  <div v-if="abierto" class="sidebar-fondo" aria-hidden="true" @click="cerrar"></div>

  <aside
    id="menu-curso"
    class="sidebar"
    :class="{ abierto, contraido }"
    @keydown.esc="cerrar"
  >
    <nav aria-label="Índice del curso" class="sidebar-nav">
      <!-- Volver a mis cursos -->
      <button type="button" class="opcion volver" :title="contraido ? 'Mis cursos' : undefined" @click="emit('volver')">
        <span class="opcion-icono" aria-hidden="true">←</span>
        <span class="opcion-nombre">Mis cursos</span>
      </button>

      <!-- Curso actual -->
      <div v-if="titulo" class="curso-actual">
        <p class="curso-titulo">{{ titulo }}</p>
        <p v-if="subtitulo" class="curso-subtitulo">{{ subtitulo }}</p>
      </div>

      <hr class="grupo-separador" aria-hidden="true" />

      <p class="grupo-titulo">Contenido del curso</p>

      <p v-if="!modulos.length" class="vacio">Todavía no hay módulos.</p>

      <ol class="lista">
        <li v-for="(modulo, i) in modulos" :key="modulo.id">
          <a
            :href="`#modulo-${modulo.id}`"
            class="opcion"
            :class="{ activa: moduloVisible === modulo.id }"
            :aria-current="moduloVisible === modulo.id ? 'location' : undefined"
            :title="contraido ? modulo.nombre : undefined"
            @click.prevent="irA('modulo', modulo.id, modulo.id)"
          >
            <span class="opcion-icono numero" aria-hidden="true">{{ i + 1 }}</span>
            <span class="opcion-nombre">{{ modulo.nombre }}</span>
          </a>

          <ol v-if="tareas[modulo.id]?.length" class="sublista">
            <li v-for="tarea in tareas[modulo.id]" :key="tarea.id">
              <a
                :href="`#tarea-${tarea.id}`"
                class="subopcion"
                @click.prevent="irA('tarea', tarea.id, modulo.id)"
              >
                {{ tarea.titulo }}
              </a>
            </li>
          </ol>
        </li>
      </ol>
    </nav>

    <!-- Contraer / expandir (solo en pantallas grandes) -->
    <button
      type="button"
      class="boton-contraer"
      :aria-expanded="contraido ? 'false' : 'true'"
      aria-controls="menu-curso"
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
/* Mismas medidas y colores que el menú del administrador (AdminSidebar.vue) */
.sidebar {
  --sidebar-ancho: 248px;
  position: fixed;
  top: var(--navbar-alto, 62px);
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

.lista,
.sublista {
  list-style: none;
  margin: 0;
  padding: 0;
}

.lista > li + li {
  margin-top: 2px;
}

.opcion {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: 0;
  border-left: 3px solid transparent;
  border-radius: 8px;
  background: none;
  color: #374151;
  text-decoration: none;
  text-align: left;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.opcion:hover {
  background: #f3f4f6;
  color: #111827;
}

.opcion.activa {
  background: #ecfdf5;
  color: #065f46;
  border-left-color: #047857;
  font-weight: 600;
}

.opcion-icono {
  width: 20px;
  flex-shrink: 0;
  text-align: center;
  font-size: 16px;
}

/* Número del módulo dentro de un círculo */
.opcion-icono.numero {
  width: 22px;
  height: 22px;
  line-height: 22px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #374151;
  font-size: 12px;
  font-weight: 700;
}

.opcion.activa .opcion-icono.numero {
  background: #047857;
  color: #ffffff;
}

.opcion-nombre {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.volver {
  color: #4b5563;
  font-size: 13px;
}

.curso-actual {
  padding: 8px 12px 4px;
}

.curso-titulo {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.curso-subtitulo {
  margin: 2px 0 0;
  font-size: 12px;
  color: #4b5563;
}

.grupo-titulo {
  margin: 12px 0 6px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b7280;
}

.grupo-separador {
  border: 0;
  border-top: 1px solid #e5e7eb;
  margin: 10px 6px 0;
}

.vacio {
  margin: 0;
  padding: 4px 12px;
  font-size: 13px;
  color: #6b7280;
}

/* Tareas debajo de cada módulo */
.sublista {
  margin: 2px 0 6px 23px;
  padding-left: 10px;
  border-left: 1px solid #e5e7eb;
}

.subopcion {
  display: block;
  padding: 5px 8px;
  border-radius: 6px;
  color: #4b5563;
  font-size: 13px;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subopcion:hover {
  background: #f3f4f6;
  color: #111827;
}

.opcion:focus-visible,
.subopcion:focus-visible,
.boton-contraer:focus-visible {
  outline: 2px solid #047857;
  outline-offset: 2px;
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

.boton-contraer-icono {
  width: 20px;
  text-align: center;
  font-size: 16px;
}

.solo-lector {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* ── Contraído: solo los números de los módulos ─────────── */
.sidebar.contraido {
  width: 72px;
  padding-left: 10px;
  padding-right: 10px;
}

.sidebar.contraido .opcion-nombre,
.sidebar.contraido .grupo-titulo,
.sidebar.contraido .curso-actual,
.sidebar.contraido .sublista,
.sidebar.contraido .vacio {
  display: none;
}

.sidebar.contraido .opcion,
.sidebar.contraido .boton-contraer {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

.sidebar.contraido .grupo-separador {
  margin-bottom: 8px;
}

.sidebar-fondo {
  display: none;
}

/* Celulares y tabletas: oculto; se abre con el botón ☰ */
@media (max-width: 900px) {
  .sidebar,
  .sidebar.contraido {
    width: var(--sidebar-ancho);
    padding-left: 12px;
    padding-right: 12px;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.12);
    z-index: 1100;
  }

  .sidebar.abierto {
    transform: translateX(0);
  }

  .sidebar.contraido .opcion-nombre,
  .sidebar.contraido .grupo-titulo,
  .sidebar.contraido .curso-actual,
  .sidebar.contraido .sublista,
  .sidebar.contraido .vacio {
    display: revert;
  }

  .sidebar.contraido .opcion {
    justify-content: flex-start;
    padding: 9px 12px;
  }

  .boton-contraer {
    display: none;
  }

  .sidebar-fondo {
    display: block;
    position: fixed;
    inset: var(--navbar-alto, 62px) 0 0 0;
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
