import { ref } from 'vue';
import { apiNormalized, api } from '@/services/apiNormalized';
import { toast } from '@/services/ToastService';

export function useMateriales() {
  const materialCounts = ref({});
  const uploadingFile = ref(false);

  const uploadMaterial = async (moduloId, file, nombrePersonalizado, descripcion) => {
    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('nombre_personalizado', nombrePersonalizado);
    formData.append('descripcion', descripcion);

    try {
      uploadingFile.value = true;
      // Usa apiNormalized para obtener respuesta normalizada
      const response = await apiNormalized.post(`/modulos/${moduloId}/materiales`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (e) {
      // FASE 1.1: Notificar error al usuario
      toast.showFromError(e);
      throw e;
    } finally {
      uploadingFile.value = false;
    }
  };

  const deleteMaterial = async (materialId) => {
    try {
      await apiNormalized.delete(`/materiales/${materialId}`);
    } catch (e) {
      // FASE 1.1: Notificar error al usuario
      toast.showFromError(e);
      throw e;
    }
  };

  const downloadMaterial = async (materialId) => {
    try {
      // Usa api raw (no normalizado) porque es un endpoint especial de descarga
      const response = await api.get(`/materiales/${materialId}/descargar`);
      window.open(response.data.download_url, '_blank');
    } catch (e) {
      // FASE 1.1: Notificar error al usuario
      toast.showFromError(e);
    }
  };

  return {
    materialCounts,
    uploadingFile,
    uploadMaterial,
    deleteMaterial,
    downloadMaterial
  };
}
