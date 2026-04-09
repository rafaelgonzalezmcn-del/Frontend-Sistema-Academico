import { ref, computed } from 'vue';
import { apiNormalized } from '@/services/apiNormalized';
import { useEntregas } from '@/composables/useEntregas';

export function useNotas() {
  const { entregasResumen, fetchEntregasResumen, fetchAllEntregasResumen } = useEntregas();
  
  const notasData = ref([]);
  const notasParciales = ref([]);
  const loadingNotas = ref(false);
  const estudianteSeleccionadoId = ref(null);

  // Estados de acordeón
  const notasEstudiantesExpandidos = ref({});
  const notasParcialesExpandidos = ref({});
  const notasParametrosExpandidos = ref({});
  const notasTareasCargadas = ref({});

  const cargarNotas = async (moduloId) => {
    if (!moduloId) {
      notasData.value = [];
      notasParciales.value = [];
      return;
    }
    try {
      loadingNotas.value = true;
      const response = await apiNormalized.get(`/modulos/${moduloId}/notas/resumen`);
      // response.data ya tiene los datos normalizados
      notasData.value = response.data || [];
      // parciales es un campo especial en la respuesta raw
      notasParciales.value = response.raw?.data?.parciales || [];
    } catch (e) {
      console.error('Error cargando notas:', e);
      notasData.value = [];
      notasParciales.value = [];
    } finally {
      loadingNotas.value = false;
    }
  };

  const toggleEstudianteNota = (estudianteId) => {
    if (!notasEstudiantesExpandidos.value[estudianteId]) {
      estudianteSeleccionadoId.value = estudianteId;
    }
    notasEstudiantesExpandidos.value[estudianteId] = !notasEstudiantesExpandidos.value[estudianteId];
  };

  const toggleParcialNota = async (estudianteId, parcialId) => {
    const key = `${estudianteId}-${parcialId}`;
    notasParcialesExpandidos.value[key] = !notasParcialesExpandidos.value[key];
    if (notasParcialesExpandidos.value[key]) {
      await cargarTareasParametros();
    }
  };

  const toggleParametroNota = (estudianteId, parcialId, parametroId) => {
    const key = `${estudianteId}-${parcialId}-${parametroId}`;
    notasParametrosExpandidos.value[key] = !notasParametrosExpandidos.value[key];
  };

  const cargarTareasParametros = async () => {
    try {
      const paramIds = new Set();
      for (const nota of notasData.value) {
        if (!notasEstudiantesExpandidos.value[nota.estudiante.id]) continue;
        for (const parcial of notasParciales.value) {
          const key = `${nota.estudiante.id}-${parcial.id}`;
          if (!notasParcialesExpandidos.value[key]) continue;
          if (parcial.parametros) {
            for (const param of parcial.parametros) {
              paramIds.add(param.id);
            }
          }
        }
      }
      for (const paramId of paramIds) {
        if (!notasTareasCargadas.value[paramId]) {
          const response = await apiNormalized.get(`/parametros/${paramId}/tareas`);
          // response.data ya tiene los datos normalizados
          notasTareasCargadas.value[paramId] = response.data || [];
        }
      }
    } catch (e) {
      console.error('Error cargando tareas de parámetros:', e);
    }
  };

  const getNotaFinal = (estudianteId) => {
    if (!estudianteId) {
      if (notasData.value.length === 0) return '0.00';
      const suma = notasData.value.reduce((acc, nota) => acc + (nota.nota_final || 0), 0);
      return (suma / notasData.value.length).toFixed(2);
    }
    const nota = notasData.value.find(n => n.estudiante.id === estudianteId);
    return nota?.nota_final?.toFixed(2) || '0.00';
  };

  const getEstudianteData = () => {
    if (!estudianteSeleccionadoId.value || !notasData.value) return null;
    return notasData.value.find(n => n.estudiante?.id === estudianteSeleccionadoId.value);
  };

  const getNotaParametroForEstudiante = (parametroId) => {
    const estudianteData = getEstudianteData();
    if (!estudianteData?.parciales) return null;
    for (const parcial of estudianteData.parciales) {
      if (parcial.parametros) {
        for (const param of parcial.parametros) {
          if (Number(param.id) === Number(parametroId)) {
            return param;
          }
        }
      }
    }
    return null;
  };

  const getTareasParametro = (parametroId) => {
    return notasTareasCargadas.value[parametroId] || [];
  };

  const obtenerTotalParametro = (parametroId) => {
    const notaParam = getNotaParametroForEstudiante(parametroId);
    if (notaParam && typeof notaParam.nota_parametro === 'number') {
      return notaParam.nota_parametro.toFixed(2);
    }
    return '-';
  };

  const obtenerCalificacionPonderada = (param) => {
    const notaParam = getNotaParametroForEstudiante(param.id);
    if (notaParam && typeof notaParam.nota_ponderada === 'number') {
      return notaParam.nota_ponderada.toFixed(2);
    }
    return '-';
  };

  const calcularPonderacion = (tarea, param) => {
    if (!estudianteSeleccionadoId.value) return '-';
    const notaParam = getNotaParametroForEstudiante(param.id);
    if (!notaParam || typeof notaParam.nota_parametro !== 'number') return '-';
    const ponderacion = (notaParam.nota_parametro / 100) * param.porcentaje;
    return ponderacion.toFixed(2);
  };

  const obtenerCalificacionTarea = (tarea) => {
    if (!estudianteSeleccionadoId.value) return '-';
    const notaParam = getNotaParametroForEstudiante(tarea.parametro_id);
    if (!notaParam || typeof notaParam.nota_parametro !== 'number') return '-';
    return notaParam.nota_parametro.toFixed(2);
  };

  const calcularPromedioGeneral = () => {
    if (notasData.value.length === 0) return '0.00';
    const suma = notasData.value.reduce((acc, nota) => acc + (nota.nota_final || 0), 0);
    return (suma / notasData.value.length).toFixed(2);
  };

  // Obtener total del parcial
  const obtenerTotalParcial = (parcialId) => {
    const estudianteData = getEstudianteData();
    if (estudianteData?.parciales) {
      const parcial = estudianteData.parciales.find(p => Number(p.id) === Number(parcialId));
      if (parcial && typeof parcial.nota_final === 'number') {
        return parcial.nota_final.toFixed(2);
      }
    }
    return '-';
  };

  // Obtener nota de un parcial específico desde el objeto nota
  // Calcula la suma de las notas_ponderadas de los parámetros
  const obtenerNotaParcial = (notaData, parcialId) => {
    if (!notaData) return '0.00';
    const parcial = notaData.parciales?.find(p => Number(p.id) === Number(parcialId));
    if (!parcial || !parcial.parametros) return '0.00';
    
    // Sumar las notas_ponderadas de cada parámetro
    let suma = 0;
    for (const param of parcial.parametros) {
      if (param.nota_ponderada !== null && param.nota_ponderada !== undefined) {
        suma += param.nota_ponderada;
      }
    }
    return suma.toFixed(2);
  };

  return {
    notasData,
    notasParciales,
    loadingNotas,
    estudianteSeleccionadoId,
    notasEstudiantesExpandidos,
    notasParcialesExpandidos,
    notasParametrosExpandidos,
    notasTareasCargadas,
    entregasResumen,
    cargarNotas,
    toggleEstudianteNota,
    toggleParcialNota,
    toggleParametroNota,
    getNotaFinal,
    getEstudianteData,
    getNotaParametroForEstudiante,
    getTareasParametro,
    obtenerTotalParametro,
    obtenerNotaParcial,
    obtenerCalificacionPonderada,
    calcularPonderacion,
    obtenerCalificacionTarea,
    calcularPromedioGeneral,
    obtenerTotalParcial,
    fetchEntregasResumen,
    fetchAllEntregasResumen
  };
}
