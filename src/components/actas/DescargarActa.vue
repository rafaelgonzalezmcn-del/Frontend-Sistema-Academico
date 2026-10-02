<script setup>
/**
 * Botones para descargar el acta de calificaciones de una materia en una sección.
 * GET /api/subjects/{subjectId}/sections/{sectionId}/acta?formato=pdf|xlsx
 *
 * Si el curso aún no se cerró, el backend genera un acta PROVISIONAL.
 */
import { ref } from 'vue';
import { api } from '@/services/apiNormalized';
import { toast } from '@/services/ToastService';

const props = defineProps({
  subjectId: { type: [Number, String], required: true },
  sectionId: { type: [Number, String], required: true },
  // Versión reducida (solo íconos) para usar dentro de tablas
  compacto: { type: Boolean, default: false }
});

const descargando = ref(null); // 'pdf' | 'xlsx' | null

// Nombre del archivo enviado por el backend (Content-Disposition)
const nombreArchivo = (cabecera, formato) => {
  const coincidencia = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cabecera || '');
  return coincidencia ? decodeURIComponent(coincidencia[1]) : `acta-calificaciones.${formato}`;
};

// Los errores llegan como Blob (por responseType: 'blob'): se leen como JSON
const mensajeDeError = async (error) => {
  try {
    const texto = await error.response?.data?.text?.();
    return JSON.parse(texto).message;
  } catch {
    return null;
  }
};

const descargar = async (formato) => {
  if (descargando.value) return;
  descargando.value = formato;

  try {
    const response = await api.get(
      `/subjects/${props.subjectId}/sections/${props.sectionId}/acta`,
      { params: { formato }, responseType: 'blob', silencioso: true }
    );

    const url = URL.createObjectURL(response.data);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo(response.headers['content-disposition'], formato);
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    const mensaje = await mensajeDeError(error);
    toast.error(mensaje || 'No se pudo generar el acta de calificaciones');
  } finally {
    descargando.value = null;
  }
};
</script>

<template>
  <div class="descargar-acta" :class="{ compacto }">
    <button
      type="button"
      class="btn-acta"
      :disabled="!!descargando"
      title="Descargar acta de calificaciones en PDF"
      @click="descargar('pdf')"
    >
      <span v-if="descargando === 'pdf'" class="spinner-acta"></span>
      <span v-else>📄</span>
      <span v-if="!compacto">Acta PDF</span>
    </button>
    <button
      type="button"
      class="btn-acta"
      :disabled="!!descargando"
      title="Descargar acta de calificaciones en Excel"
      @click="descargar('xlsx')"
    >
      <span v-if="descargando === 'xlsx'" class="spinner-acta"></span>
      <span v-else>📊</span>
      <span v-if="!compacto">Acta Excel</span>
    </button>
  </div>
</template>

<style scoped>
.descargar-acta {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.btn-acta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #1e3a5f;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.btn-acta:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.btn-acta:disabled {
  opacity: 0.6;
  cursor: wait;
}

.compacto .btn-acta {
  padding: 4px 8px;
}

.spinner-acta {
  width: 12px;
  height: 12px;
  border: 2px solid #cbd5e1;
  border-top-color: #1e3a5f;
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}

@keyframes girar {
  to { transform: rotate(360deg); }
}
</style>
