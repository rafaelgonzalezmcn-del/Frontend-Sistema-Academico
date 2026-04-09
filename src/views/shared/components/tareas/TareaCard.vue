<script setup>
import { formatFecha, formatFileSize, getEstadoColor } from '@/utils/formatters';

const props = defineProps({
  tarea: { type: Object, required: true },
  moduloId: { type: [Number, String], required: true },
  isEditing: { type: Boolean, default: false },
  editable: { type: Boolean, default: false }
});

const emit = defineEmits(['edit', 'delete', 'viewEntregas', 'download']);

const getArchivoNombre = () => {
  return props.tarea.archivo_nombre || props.tarea.archivo?.nombre || null;
};

const getArchivoTamano = () => {
  return props.tarea.archivo_tamano || props.tarea.archivo?.tamano || null;
};
</script>

<template>
  <div class="tarea-card">
    <!-- Modo edición (si el padre lo maneja) -->
    <div v-if="isEditing && editable" class="tarea-edit-mode">
      <slot name="edit-form"></slot>
    </div>

    <!-- Modo visualización -->
    <div v-else class="tarea-view-mode">
      <div class="tarea-header">
        <div class="tarea-info">
          <h4 class="tarea-titulo">{{ tarea.titulo }}</h4>
          <p v-if="tarea.descripcion" class="tarea-descripcion">{{ tarea.descripcion }}</p>
          
          <!-- Fecha -->
          <div class="tarea-fecha">
            <span class="fecha-label">📅 Límite:</span>
            <span 
              class="fecha-valor" 
              :style="{ color: getEstadoColor(tarea.estado) }"
            >
              {{ formatFecha(tarea.fecha_limite) }}
              <span class="estado-badge" :class="tarea.estado">
                {{ tarea.estado === 'vencida' ? '🔴 Vencida' : '🟡 Pendiente' }}
              </span>
            </span>
          </div>

          <!-- Puntaje -->
          <div class="tarea-puntaje">
            <span class="puntaje-label">📊 Puntaje máximo:</span>
            <span class="puntaje-valor">{{ tarea.puntaje_maximo || 100 }} puntos</span>
          </div>

          <!-- Parcial y Parámetro -->
          <div v-if="tarea.parcial_id || tarea.parametro_id" class="tarea-categorias">
            <span v-if="tarea.parcial" class="categoria-badge parcial">
              📚 {{ tarea.parcial?.nombre || 'Parcial' }}
            </span>
            <span v-if="tarea.parametro" class="categoria-badge parametro">
              📋 {{ tarea.parametro?.nombre || 'Parámetro' }}
            </span>
          </div>

          <!-- Archivo -->
          <div v-if="getArchivoNombre()" class="tarea-archivo">
            <span class="archivo-icon">📎</span>
            <span 
              class="archivo-name" 
              @click="emit('download', tarea)"
              style="cursor: pointer; color: #3b82f6; text-decoration: underline;"
            >
              {{ getArchivoNombre() }}
            </span>
            <span class="archivo-size">({{ formatFileSize(getArchivoTamano()) }})</span>
          </div>

          <!-- Info entregas -->
          <div class="tarea-entregas-info">
            <span class="entregas-icon">📋</span>
            <span class="entregas-text">
              Haz clic en "Ver Entregas" para ver las entregas de los estudiantes
            </span>
          </div>
        </div>

        <!-- Acciones -->
        <div class="tarea-actions">
          <button @click="emit('edit', tarea)" class="btn-icon edit" title="Editar">✏️</button>
          <button @click="emit('delete', tarea.id)" class="btn-icon delete" title="Eliminar">🗑️</button>
        </div>
      </div>

      <!-- Ver entregas -->
      <div class="tarea-ver-entregas mt-2 d-flex align-items-center gap-2">
        <button @click="emit('viewEntregas', tarea.id)" class="btn btn-sm btn-primary">
          📋 Ver Entregas de Estudiantes
        </button>
      </div>
    </div>
  </div>
</template>
