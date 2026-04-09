import { ref } from 'vue';
import { apiNormalized } from '@/services/apiNormalized';

export function useMisNotas() {
  const misNotas = ref([]);
  const notaFinal = ref(0);
  const loadingNotas = ref(false);
  const error = ref(null);
  const parcialesData = ref([]);
  const tareasCargadas = ref({});

  // Cargar las notas del estudiante logueado
  const cargarMisNotas = async (moduloId) => {
    if (!moduloId) {
      misNotas.value = [];
      notaFinal.value = 0;
      return;
    }
    try {
      loadingNotas.value = true;
      error.value = null;
      // Endpoint para obtener las notas del estudiante logueado
      const response = await apiNormalized.get(`/modulos/${moduloId}/notas/mis-notas`);
      console.log('misNotas response:', response.data);
      // response.data ya tiene los datos normalizados
      misNotas.value = response.data || [];
      // nota_final es un campo especial en la respuesta raw
      notaFinal.value = response.raw?.data?.nota_final || 0;
      
      // También cargar los parciales del módulo para tener la estructura completa
      const parcialesResponse = await apiNormalized.get(`/modulos/${moduloId}/parciales`);
      parcialesData.value = parcialesResponse.data || [];
    } catch (e) {
      console.error('Error cargando notas:', e);
      error.value = e.message || 'Error al cargar notas';
      misNotas.value = [];
      notaFinal.value = 0;
    } finally {
      loadingNotas.value = false;
    }
  };

  // Cargar tareas de un parámetro
  const cargarTareasParametro = async (parametroId) => {
    if (!parametroId) return;
    if (tareasCargadas.value[parametroId]) return;
    try {
      console.log('Cargando tareas para parametro:', parametroId);
      const response = await apiNormalized.get(`/parametros/${parametroId}/tareas`);
      console.log('Tareas response:', response.data);
      // response.data ya tiene los datos normalizados
      tareasCargadas.value[parametroId] = response.data || [];
    } catch (e) {
      console.error('Error cargando tareas:', e);
      tareasCargadas.value[parametroId] = [];
    }
  };

  // Obtener tareas de un parámetro
  const getTareasParametro = (parametroId) => {
    return tareasCargadas.value[parametroId] || [];
  };

  // Obtener nota de tarea para el estudiante
  const getNotaTarea = (tarea) => {
    // Buscar en los detalles del estudiante
    for (const nota of misNotas.value) {
      if (nota.detalles) {
        for (const detalle of nota.detalles) {
          if (detalle.tareas) {
            const tareaEncontrada = detalle.tareas.find(t => t.id === tarea.id);
            if (tareaEncontrada && tareaEncontrada.nota !== undefined) {
              return tareaEncontrada.nota;
            }
          }
        }
      }
    }
    return null;
  };

  // Obtener nota final formateada
  const getNotaFinal = () => {
    return notaFinal.value?.toFixed(2) || '0.00';
  };

  // Obtener nota de un parcial específico
  const obtenerNotaParcial = (parcialId) => {
    const parcial = misNotas.value.find(p => p.parcial?.id === parcialId);
    if (!parcial) return '0.00';
    return parcial.nota_final?.toFixed(2) || '0.00';
  };

  // Obtener nombre del tipo de parámetro
  const getTipoNombre = (tipo) => {
    const tipos = {
      'actividades_clase': 'Actividades en clase',
      'tareas': 'Tareas',
      'actuacion': 'Actuación',
      'examenes': 'Exámenes'
    };
    return tipos[tipo] || tipo;
  };

  return {
    misNotas,
    notaFinal,
    loadingNotas,
    error,
    parcialesData,
    tareasCargadas,
    cargarMisNotas,
    cargarTareasParametro,
    getTareasParametro,
    getNotaTarea,
    getNotaFinal,
    obtenerNotaParcial,
    getTipoNombre
  };
}
