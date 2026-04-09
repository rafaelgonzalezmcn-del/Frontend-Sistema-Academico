import { ref, computed, watch } from 'vue';
import api from '@/services/api';
import { getData, getListData } from '@/utils/responseHelper';
import { useEntregas } from '@/composables/useEntregas';
import { useParciales } from '@/composables/useParciales';

export function useTareas(modulos) {
  const { entregasResumen, fetchEntregasResumen, fetchAllEntregasResumen } = useEntregas();
  
  const tareas = ref({});
  const loadingTareas = ref(false);
  const showAddTarea = ref(false);
  const editingTareaId = ref(null);
  const editingTareaData = ref({});
  const editingTareaArchivo = ref(null);

  // Datos para formularios
  const newTareaModuloId = ref(null);
  const newTareaTitulo = ref('');
  const newTareaDescripcion = ref('');
  const newTareaFechaLimite = ref('');
  const newTareaPuntajeMaximo = ref(100);
  const newTareaArchivo = ref(null);
  const newTareaParcialId = ref(null);
  const newTareaParametroId = ref(null);

  const savingTarea = ref(false);

  // Parámetros para edición
  const parametrosEdicion = ref([]);

  // Computed
  const todasLasTareas = computed(() => {
    return Object.values(tareas.value).flat();
  });

  const tareasPorModulo = computed(() => {
    return tareas.value;
  });

  // Métodos
  const fetchTareas = async (moduloId) => {
    try {
      const response = await api.get(`/modulos/${moduloId}/tareas`);
      // Compatible con ambos formatos (antiguo y nuevo)
      tareas.value[moduloId] = getListData(response);
    } catch (e) {
      console.error('Error fetching tareas:', e);
    }
  };

  const fetchAllTareas = async () => {
    if (!modulos.value || modulos.value.length === 0) return;
    loadingTareas.value = true;
    try {
      for (const modulo of modulos.value) {
        await fetchTareas(modulo.id);
      }
      
      // Obtener entregas con mi_entrega incluida
      const resultados = await fetchAllEntregasResumen(tareas.value);
      
      // Asignar mi_entrega a cada tarea
      for (const [tareaId, data] of Object.entries(resultados)) {
        // Buscar la tarea en todas las listas por modulo
        for (const moduloId in tareas.value) {
          const tareaIndex = tareas.value[moduloId].findIndex(t => t.id === Number(tareaId));
          if (tareaIndex !== -1) {
            if (data.mi_entrega) {
              tareas.value[moduloId][tareaIndex].mi_entrega = data.mi_entrega;
            }
            if (data.ha_entregado !== undefined) {
              tareas.value[moduloId][tareaIndex].ha_entregado = data.ha_entregado;
            }
            if (data.resumen) {
              tareas.value[moduloId][tareaIndex].resumen = data.resumen;
            }
            break;
          }
        }
      }
    } finally {
      loadingTareas.value = false;
    }
  };

  const createTarea = async () => {
    if (!newTareaTitulo.value.trim() || !newTareaFechaLimite.value) return null;
    
    try {
      savingTarea.value = true;
      const formData = new FormData();
      formData.append('titulo', newTareaTitulo.value);
      formData.append('descripcion', newTareaDescripcion.value || '');
      formData.append('fecha_limite', newTareaFechaLimite.value);
      formData.append('modulo_id', newTareaModuloId.value);
      formData.append('puntaje_maximo', newTareaPuntajeMaximo.value);
      if (newTareaParcialId.value) formData.append('parcial_id', newTareaParcialId.value);
      if (newTareaParametroId.value) formData.append('parametro_id', newTareaParametroId.value);
      if (newTareaArchivo.value) formData.append('archivo', newTareaArchivo.value);

      const response = await api.post('/tareas', formData);
      
      if (!tareas.value[newTareaModuloId.value]) {
        tareas.value[newTareaModuloId.value] = [];
      }
      // Compatible con ambos formatos
      const newTarea = getData(response);
      tareas.value[newTareaModuloId.value].push(newTarea);

      resetNewTareaForm();
      return newTarea;
    } catch (e) {
      console.error('Error creating tarea:', e);
      throw e;
    } finally {
      savingTarea.value = false;
    }
  };

  const updateTarea = async (tareaId, data) => {
    try {
      savingTarea.value = true;
      const formData = new FormData();
      formData.append('titulo', data.titulo);
      formData.append('descripcion', data.descripcion || '');
      formData.append('fecha_limite', data.fecha_limite);
      formData.append('puntaje_maximo', Number(data.puntaje_maximo) || 100);
      formData.append('modulo_id', Number(data.moduloId));
      
      if (data.parcial_id && data.parcial_id > 0) {
        formData.append('parcial_id', Number(data.parcial_id));
      }
      if (data.parametro_id && data.parametro_id > 0) {
        formData.append('parametro_id', Number(data.parametro_id));
      }
      if (editingTareaArchivo.value) {
        formData.append('archivo', editingTareaArchivo.value);
      }

      const response = await api.put(`/tareas/${tareaId}`, formData);
      const moduloId = data.moduloId;
      const index = tareas.value[moduloId].findIndex(t => t.id === tareaId);
      const updatedTarea = getData(response);
      if (index !== -1) {
        tareas.value[moduloId][index] = updatedTarea;
      }
      return updatedTarea;
    } catch (e) {
      console.error('Error updating tarea:', e);
      throw e;
    } finally {
      savingTarea.value = false;
    }
  };

  const deleteTarea = async (tareaId, moduloId) => {
    try {
      await api.delete(`/tareas/${tareaId}`);
      tareas.value[moduloId] = tareas.value[moduloId].filter(t => t.id !== tareaId);
    } catch (e) {
      console.error('Error deleting tarea:', e);
      throw e;
    }
  };

  const startEditTarea = async (tarea, moduloId) => {
    editingTareaId.value = tarea.id;
    
    let fechaFormateada = '';
    if (tarea.fecha_limite) {
      const fecha = new Date(tarea.fecha_limite);
      fechaFormateada = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}T${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
    }
    
    editingTareaData.value = {
      titulo: tarea.titulo,
      descripcion: tarea.descripcion || '',
      fecha_limite: fechaFormateada,
      puntaje_maximo: tarea.puntaje_maximo || 100,
      moduloId: moduloId,
      parcial_id: tarea.parcial_id && tarea.parcial_id > 0 ? Number(tarea.parcial_id) : null,
      parametro_id: tarea.parametro_id && tarea.parametro_id > 0 ? Number(tarea.parametro_id) : null
    };
    
    // Cargar parámetros para edición si hay parcial
    if (tarea.parcial_id) {
      try {
        const response = await api.get(`/parciales/${tarea.parcial_id}/parametros`);
        parametrosEdicion.value = getListData(response);
      } catch (e) {
        console.error('Error cargando parámetros para edición:', e);
        parametrosEdicion.value = [];
      }
    } else {
      parametrosEdicion.value = [];
    }
  };

  const cancelEditTarea = () => {
    editingTareaId.value = null;
    editingTareaData.value = {};
    editingTareaArchivo.value = null;
    parametrosEdicion.value = [];
  };

  const resetNewTareaForm = () => {
    newTareaTitulo.value = '';
    newTareaDescripcion.value = '';
    newTareaFechaLimite.value = '';
    newTareaPuntajeMaximo.value = 100;
    newTareaArchivo.value = null;
    newTareaModuloId.value = null;
    newTareaParcialId.value = null;
    newTareaParametroId.value = null;
    showAddTarea.value = false;
  };

  const handleTareaFileSelect = (file) => {
    newTareaArchivo.value = file;
  };

  const handleEditTareaFileSelect = (file) => {
    editingTareaArchivo.value = file;
  };

  const notaMaximaSugerida = computed(() => {
    if (!newTareaParametroId.value) return null;
    const { parametros } = useParciales();
    const param = parametros.value.find(p => p.id === newTareaParametroId.value);
    return param?.nota_maxima_default || null;
  });

  return {
    tareas,
    loadingTareas,
    showAddTarea,
    editingTareaId,
    editingTareaData,
    newTareaModuloId,
    newTareaTitulo,
    newTareaDescripcion,
    newTareaFechaLimite,
    newTareaPuntajeMaximo,
    newTareaArchivo,
    newTareaParcialId,
    newTareaParametroId,
    parametrosEdicion,
    savingTarea,
    todasLasTareas,
    tareasPorModulo,
    fetchTareas,
    fetchAllTareas,
    createTarea,
    updateTarea,
    deleteTarea,
    startEditTarea,
    cancelEditTarea,
    resetNewTareaForm,
    handleTareaFileSelect,
    handleEditTareaFileSelect,
    notaMaximaSugerida
  };
}
