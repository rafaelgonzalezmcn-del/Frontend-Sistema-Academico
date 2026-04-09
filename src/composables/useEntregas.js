import { ref } from 'vue';
import EntregaService from '@/services/EntregaService';

export function useEntregas() {
  // Esta variable ya no se usa directamente - ahora devolvemos datos en fetchAllEntregasResumen
  const entregasResumen = ref({});

  const fetchEntregasResumen = async (tareaId) => {
    try {
      const response = await EntregaService.obtenerEntregasTarea(tareaId);
      
      // Usar response.raw.data para obtener la respuesta completa del backend
      const data = response.raw?.data;
      
      if (!data) return null;
      
      // Para estudiantes: devolver todo (incluye mi_entrega)
      if (data.mi_entrega !== undefined) {
        return data;
      } else {
        // Es profesor - solo resumen
        return { resumen: data.resumen };
      }
    } catch (e) {
      return null;
    }
  };

  const fetchAllEntregasResumen = async (tareas) => {
    const resultados = {};
    
    for (const moduloId in tareas) {
      const tareasModulo = tareas[moduloId];
      if (tareasModulo && tareasModulo.length > 0) {
        for (const tarea of tareasModulo) {
          const resultado = await fetchEntregasResumen(tarea.id);
          if (resultado) {
            resultados[tarea.id] = {
              mi_entrega: resultado.mi_entrega || null,
              ha_entregado: resultado.ha_entregado ?? false,
              resumen: resultado.resumen || null
            };
          }
        }
      }
    }
    
    return resultados;
  };

  return {
    entregasResumen,
    fetchEntregasResumen,
    fetchAllEntregasResumen
  };
}
