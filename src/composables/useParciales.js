import { ref } from 'vue';
import ParcialService from '@/services/ParcialService';
import { toast } from '@/services/ToastService';

export function useParciales() {
  const parciales = ref([]);
  const parametros = ref([]);
  const loadingParciales = ref(false);

  const cargarParciales = async (moduloId) => {
    if (!moduloId) {
      parciales.value = [];
      return;
    }
    try {
      loadingParciales.value = true;
      const response = await ParcialService.obtenerParciales(moduloId);
      // El servicio ahora devuelve datos normalizados, no hace falta response.data.data
      parciales.value = response.data || [];
    } catch (e) {
      // FASE 1.1: Notificar error al usuario en lugar de solo console.error
      toast.showFromError(e);
      parciales.value = [];
    } finally {
      loadingParciales.value = false;
    }
  };

  const cargarParametros = async (parcialId) => {
    if (!parcialId) {
      parametros.value = [];
      return;
    }
    try {
      const response = await ParcialService.obtenerParametros(parcialId);
      // El servicio ahora devuelve datos normalizados
      parametros.value = response.data || [];
    } catch (e) {
      // FASE 1.1: Notificar error al usuario en lugar de solo console.error
      toast.showFromError(e);
      parametros.value = [];
    }
  };

  const crearParcial = async (data) => {
    const response = await ParcialService.crearParcial(data);
    await cargarParciales(data.modulo_id);
    return response;
  };

  const actualizarParcial = async (id, data) => {
    const response = await ParcialService.actualizarParcial(id, data);
    return response;
  };

  const crearParametro = async (parcialId, data) => {
    const response = await ParcialService.crearParametro(parcialId, data);
    return response;
  };

  const actualizarParametro = async (id, data) => {
    const response = await ParcialService.actualizarParametro(id, data);
    return response;
  };

  const sumaPorcentajes = (parcial) => {
    if (!parcial?.parametros) return 0;
    return parcial.parametros.reduce((sum, p) => sum + (parseFloat(p.porcentaje) || 0), 0);
  };

  return {
    parciales,
    parametros,
    loadingParciales,
    cargarParciales,
    cargarParametros,
    crearParcial,
    actualizarParcial,
    crearParametro,
    actualizarParametro,
    sumaPorcentajes
  };
}
