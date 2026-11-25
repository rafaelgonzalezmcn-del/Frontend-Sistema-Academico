<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  modulos: {
    type: Array,
    default: () => []
  },
  modulosColapsados: {
    type: Object,
    default: () => ({})
  },
  loading: Boolean,
  showAddModule: Boolean,
  newModuleName: String,
  newModuleDescription: String,
  savingModule: Boolean,
  editingModuleId: Number,
  editingModuleName: String,
  editingModuleDescription: String,
  savingEdit: Boolean,
  materialCounts: {
    type: Object,
    default: () => ({})
  },
  materiaId: Number,
  // Tareas de cada módulo: { moduloId: [tareas] }
  tareas: {
    type: Object,
    default: () => ({})
  },
  // Resumen de entregas por tarea: { tareaId: { total_entregados, total_estudiantes } }
  entregasResumen: {
    type: Object,
    default: () => ({})
  }
});

// Fecha límite legible, por ejemplo "12 nov 2026, 23:59"
const formatearFechaLimite = (fecha) => {
  if (!fecha) return 'Sin fecha límite';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
};

const emit = defineEmits([
  'ver-entregas',
  'modulo-visible',
  'update:newModuleName',
  'update:newModuleDescription',
  'update:showAddModule',
  'toggle-modulo',
  'create-module',
  'start-edit',
  'save-edit',
  'cancel-edit',
  'delete-module',
  'view-material',
  'delete-material',
  'show-upload-modal',
  'update:editingModuleName',
  'update:editingModuleDescription',
  'file-selected'
]);

// ─── Navegación desde el índice del curso (menú lateral) ──────────
// El aula llama a irA() cuando se hace clic en el menú lateral; este
// componente avisa qué módulo está en pantalla para resaltarlo allí.

const moduloVisible = ref(null);       // módulo que se está viendo (se resalta en el índice)
const resaltadoId = ref(null);         // elemento al que se acaba de saltar (se resalta un momento)
let temporizadorResaltado = null;

const movimientoReducido = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const irA = async (tipo, id, moduloId) => {
  // Si el módulo está contraído, se abre primero para que se vea la tarea
  if (props.modulosColapsados[moduloId]) {
    emit('toggle-modulo', moduloId);
    await nextTick();
  }

  const elementoId = `${tipo}-${id}`;
  const elemento = document.getElementById(elementoId);
  if (!elemento) return;

  elemento.scrollIntoView({ behavior: movimientoReducido() ? 'auto' : 'smooth', block: 'start' });
  moduloVisible.value = Number(moduloId); // se marca de inmediato en el índice
  elemento.focus({ preventScroll: true }); // para teclado y lectores de pantalla

  resaltadoId.value = elementoId;
  clearTimeout(temporizadorResaltado);
  temporizadorResaltado = setTimeout(() => { resaltadoId.value = null; }, 1600);
};

// Resalta en el índice el módulo que está en pantalla.
// Se calcula en cada desplazamiento: el módulo activo es el último cuyo
// inicio ya pasó por debajo de la barra superior. Al llegar al final de
// la página se marca el último módulo (aunque su inicio no haya subido).
const MARGEN_SUPERIOR = 120; // alto de la barra superior + un poco de aire
let cuadroPendiente = null;

const calcularModuloVisible = () => {
  cuadroPendiente = null;
  const tarjetas = props.modulos
    .map(m => document.getElementById(`modulo-${m.id}`))
    .filter(Boolean);
  if (!tarjetas.length) {
    moduloVisible.value = null;
    return;
  }

  const alFinal = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  if (alFinal) {
    moduloVisible.value = Number(tarjetas[tarjetas.length - 1].dataset.moduloId);
    return;
  }

  let activa = tarjetas[0];
  for (const tarjeta of tarjetas) {
    if (tarjeta.getBoundingClientRect().top <= MARGEN_SUPERIOR) {
      activa = tarjeta;
    } else {
      break;
    }
  }
  moduloVisible.value = Number(activa.dataset.moduloId);
};

// Como mucho un cálculo por cuadro de animación (el desplazamiento dispara muchos eventos)
const alDesplazar = () => {
  if (cuadroPendiente === null) {
    cuadroPendiente = requestAnimationFrame(calcularModuloVisible);
  }
};

const observarModulos = async () => {
  await nextTick();
  calcularModuloVisible();
};

onMounted(() => {
  window.addEventListener('scroll', alDesplazar, { passive: true });
  window.addEventListener('resize', alDesplazar, { passive: true });
  observarModulos();
});

// Si cambian los módulos (se crea, borra o contrae uno) se recalcula
watch(() => props.modulos.map(m => m.id).join(','), observarModulos);
watch(() => JSON.stringify(props.modulosColapsados), observarModulos);

onBeforeUnmount(() => {
  window.removeEventListener('scroll', alDesplazar);
  window.removeEventListener('resize', alDesplazar);
  if (cuadroPendiente !== null) cancelAnimationFrame(cuadroPendiente);
  clearTimeout(temporizadorResaltado);
});

watch(moduloVisible, (id) => emit('modulo-visible', id));

defineExpose({ irA });


// Format file size
const formatFileSize = (tamano) => {
  if (!tamano) return '0 KB';
  return Math.round(tamano / 1024) + ' KB';
};
</script>

<template>
  <section class="modules-section">
    <!-- Grid de módulos -->
    <div class="modules-grid">
      <!-- Cards de módulos existentes -->
      <div 
        v-for="modulo in modulos" 
        :key="modulo.id" 
        class="module-card"
        :class="{ resaltado: resaltadoId === 'modulo-' + modulo.id }"
        :id="'modulo-' + modulo.id"
        :data-modulo-id="modulo.id"
        tabindex="-1"
      >
        <!-- Header del módulo -->
        <div class="module-header">
          <!-- Modo edición -->
          <div v-if="editingModuleId === modulo.id" class="edit-mode">
            <div class="edit-fields">
              <input 
                :value="editingModuleName"
                @input="$emit('update:editingModuleName', $event.target.value)"
                type="text" 
                class="edit-input"
                placeholder="Nombre del módulo"
                @keyup.enter="$emit('save-edit', modulo.id)"
                @keyup.escape="$emit('cancel-edit')"
                autofocus
              />
              <input 
                :value="editingModuleDescription"
                @input="$emit('update:editingModuleDescription', $event.target.value)"
                type="text" 
                class="edit-input"
                placeholder="Descripción (opcional)"
                @keyup.enter="$emit('save-edit', modulo.id)"
              />
            </div>
            <div class="edit-actions">
              <button @click="$emit('save-edit', modulo.id)" class="btn-icon save" :disabled="savingEdit">
                ✓
              </button>
              <button @click="$emit('cancel-edit')" class="btn-icon cancel">✕</button>
            </div>
          </div>
          
          <!-- Modo visualización -->
          <div v-else class="view-mode">
            <button 
              class="toggle-btn"
              @click="$emit('toggle-modulo', modulo.id)"
            >
              <span class="toggle-arrow" :class="{ collapsed: modulosColapsados[modulo.id] }">▼</span>
            </button>
            <div class="module-title-section">
              <h3 class="module-title">
                📦 {{ modulo.nombre }}
                <span class="material-count">
                  ({{ materialCounts[modulo.id] || 0 }} archivos, {{ tareas[modulo.id]?.length || 0 }} tareas)
                </span>
              </h3>
              <p v-if="modulo.descripcion" class="module-description">
                {{ modulo.descripcion }}
              </p>
            </div>
            <div class="module-actions">
              <button @click="$emit('start-edit', modulo)" class="btn-icon edit" title="Editar">
                ✏️
              </button>
              <button @click="$emit('delete-module', modulo.id)" class="btn-icon delete" title="Eliminar">
                🗑️
              </button>
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
            >
              <div class="material-info" @click="$emit('view-material', material)">
                <div class="material-main">
                  <span class="material-icon">📄</span>
                  <span class="material-name">{{ material.nombre_archivo }}</span>
                  <span class="material-size">({{ formatFileSize(material.tamano) }})</span>
                </div>
                <div v-if="material.descripcion" class="material-descripcion">
                  {{ material.descripcion }}
                </div>
              </div>
              <button 
                @click.stop="$emit('delete-material', modulo.id, material.id)" 
                class="btn-icon delete-material"
                title="Eliminar"
              >
                ✕
              </button>
            </div>
            
            <div v-if="!modulo.materiales?.length" class="no-materials">
              No hay materiales
            </div>
          </div>

          <!-- Tareas del módulo -->
          <div class="tareas-modulo">
            <p class="tareas-modulo-titulo">Tareas</p>
            <ul v-if="tareas[modulo.id]?.length" class="tareas-modulo-lista">
              <li v-for="tarea in tareas[modulo.id]" :key="tarea.id">
                <button
                  :id="'tarea-' + tarea.id"
                  type="button"
                  class="tarea-item"
                  :class="{ resaltado: resaltadoId === 'tarea-' + tarea.id }"
                  :title="`Ver entregas de ${tarea.titulo}`"
                  @click="$emit('ver-entregas', tarea.id)"
                >
                  <span class="tarea-icono" aria-hidden="true">📝</span>
                  <span class="tarea-texto">
                    <span class="tarea-titulo">{{ tarea.titulo }}</span>
                    <span class="tarea-fecha">Entrega: {{ formatearFechaLimite(tarea.fecha_limite) }}</span>
                  </span>
                  <span
                    v-if="entregasResumen[tarea.id]"
                    class="tarea-entregas"
                  >
                    {{ entregasResumen[tarea.id].total_entregados }}/{{ entregasResumen[tarea.id].total_estudiantes }} entregas
                  </span>
                  <span class="tarea-estado" :class="tarea.estado === 'vencida' ? 'vencida' : 'pendiente'">
                    {{ tarea.estado === 'vencida' ? 'Vencida' : 'Abierta' }}
                  </span>
                </button>
              </li>
            </ul>
            <p v-else class="no-materials">
              No hay tareas en este módulo. Créalas en la pestaña Tareas eligiendo este módulo.
            </p>
          </div>

          <!-- Botón subir archivo -->
          <div class="upload-section">
            <input 
              :id="`file-input-${modulo.id}`"
              type="file" 
              accept=".pdf,.zip,.doc,.docx"
              class="file-hidden"
              @change="$emit('file-selected', $event, modulo.id)"
            />
            <button 
              @click="$emit('show-upload-modal', modulo.id)" 
              class="btn-upload"
            >
              📎 Subir archivo (PDF, ZIP, Word)
            </button>
          </div>
        </div>
      </div>

      <!-- Card: Agregar módulo -->
      <div 
        v-if="!showAddModule" 
        class="module-card add-card"
        @click="$emit('update:showAddModule', true)"
      >
        <div class="add-content">
          <span class="add-icon">+</span>
          <span class="add-text">Agregar nuevo módulo</span>
        </div>
      </div>

      <!-- Card: Formulario agregar -->
      <div v-else class="module-card add-form-card">
        <div class="add-form">
          <input 
            :value="newModuleName"
            @input="$emit('update:newModuleName', $event.target.value)"
            type="text" 
            placeholder="Nombre del nuevo módulo *"
            class="add-input"
            @keyup.enter="$emit('create-module')"
            autofocus
          />
          <textarea 
            :value="newModuleDescription"
            @input="$emit('update:newModuleDescription', $event.target.value)"
            placeholder="Descripción del módulo (opcional)"
            class="add-textarea"
            rows="2"
          ></textarea>
          <div class="add-actions">
            <button 
              @click="$emit('create-module')" 
              class="btn-primary btn-sm"
              :disabled="savingModule || !newModuleName?.trim()"
            >
              {{ savingModule ? 'Guardando...' : 'Crear' }}
            </button>
            <button 
              @click="$emit('update:showAddModule', false)" 
              class="btn-secondary btn-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Animación para collapse - usa estilos de global.css */
.module-content {
  overflow: hidden;
  max-height: 2000px;
  opacity: 1;
  transition: all 0.3s ease;
}

.module-content.content-collapsed {
  max-height: 0;
  opacity: 0;
}

/* ── Tareas del módulo ───────────────────────────────── */
.tareas-modulo {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed #e5e7eb;
}

.tareas-modulo-titulo {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6b7280;
}

.tareas-modulo-lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tarea-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.tarea-item:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.tarea-item:focus-visible {
  outline: 2px solid #047857;
  outline-offset: 2px;
}

.tarea-icono {
  font-size: 18px;
}

.tarea-texto {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.tarea-titulo {
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tarea-fecha {
  font-size: 12px;
  color: #4b5563;
}

.tarea-entregas {
  font-size: 12px;
  color: #374151;
  white-space: nowrap;
}

.tarea-estado {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.tarea-estado.pendiente {
  background: #ecfdf5;
  color: #065f46;
}

.tarea-estado.vencida {
  background: #fef2f2;
  color: #991b1b;
}

@media (max-width: 600px) {
  .tarea-entregas {
    display: none;
  }
}

/* Que el destino no quede tapado por la barra superior fija */
.module-card,
.tarea-item {
  scroll-margin-top: calc(var(--navbar-alto, 62px) + 16px);
}

.module-card:focus {
  outline: none;
}

/* Resaltado breve del lugar al que se saltó */
.module-card.resaltado,
.tarea-item.resaltado {
  box-shadow: 0 0 0 3px #6ee7b7;
  transition: box-shadow 0.2s;
}

</style>
