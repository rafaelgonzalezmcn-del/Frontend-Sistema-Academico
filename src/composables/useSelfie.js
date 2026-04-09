/**
 * Composable para gestionar la selfie del usuario
 * Maneja: selección, crop, subida, eliminación y visualización
 */
import { ref, computed, onUnmounted } from 'vue';
import { apiNormalized as api, api as apiRaw } from '../services/apiNormalized';

// Constantes
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const VALID_TYPES = ['image/jpeg', 'image/png'];
const CROP_SIZE = 200;

export function useSelfie(options = {}) {
  const { onSuccess, onError } = options;

// Estado reactivo
const selfieFile = ref(null);
const uploadingSelfie = ref(false);
const showCropperModal = ref(false);
const croppedImageBlob = ref(null);
const showDeleteConfirm = ref(false);

// Estado del usuario
const userHasSelfie = ref(false);
const selfieBlobUrl = ref(null);

// Estado del cropper (reemplaza window._cropperState)
const cropperState = ref({ x: 0, y: 0, scale: 1 });
const cropperImageRef = ref(null);
const cropperWrapperRef = ref(null);

// Cache para URLs de blob
let currentCropperUrl = '';

// Computed: URL para el cropper - gestión de memoria mejorada
const cropperImageSrc = computed(() => {
  if (!selfieFile.value) return '';
  // Limpiar URL anterior
  if (currentCropperUrl) {
    URL.revokeObjectURL(currentCropperUrl);
  }
  currentCropperUrl = URL.createObjectURL(selfieFile.value);
  return currentCropperUrl;
});

  // Limpiar URL de blob
  const revokeBlobUrl = (url) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  };

// Limpiar todos los blobs
const cleanupAllBlobs = () => {
  revokeBlobUrl(selfieBlobUrl.value);
  if (currentCropperUrl) {
    URL.revokeObjectURL(currentCropperUrl);
    currentCropperUrl = '';
  }
  selfieBlobUrl.value = null;
};

  // Cargar selfie del backend
  const checkSelfie = async () => {
    try {
      const response = await apiRaw.get('/profile/selfie', { responseType: 'blob' });
      if (response.data && response.data.size > 0) {
        userHasSelfie.value = true;
        selfieBlobUrl.value = URL.createObjectURL(response.data);
      } else {
        userHasSelfie.value = false;
        selfieBlobUrl.value = null;
      }
    } catch (e) {
      // 404 significa que no tiene selfie (es normal)
      userHasSelfie.value = false;
      selfieBlobUrl.value = null;
    }
  };

  // Validar archivo
  const validateFile = (file) => {
    if (!file) return 'No se seleccionó ningún archivo';
    if (!VALID_TYPES.includes(file.type)) return 'Solo se permiten imágenes JPEG o PNG';
    if (file.size > MAX_FILE_SIZE) return 'La imagen no puede superar 2MB';
    return null;
  };

  // Manejar selección de archivo
  const handleSelfieSelect = (event) => {
    const file = event.target.files[0];
    const errorMsg = validateFile(file);
    if (errorMsg) {
      onError?.(errorMsg);
      return;
    }
    selfieFile.value = file;
    showCropperModal.value = true;
    resetCropperState();
  };

  // Resetear estado del cropper
  const resetCropperState = () => {
    cropperState.value = { x: 0, y: 0, scale: 1 };
  };

  // Inicializar cropper (drag + zoom)
  const initCropper = () => {
    const imageEl = cropperImageRef.value;
    if (!imageEl) return;

    // Resetear estilos iniciales
    imageEl.style.position = 'absolute';
    imageEl.style.left = '50%';
    imageEl.style.top = '50%';
    imageEl.style.transform = 'translate(-50%, -50%) scale(1)';
    imageEl.style.cursor = 'move';
    imageEl.style.transition = 'none';

    resetCropperState();
  };

  // Actualizar transform de la imagen
  const updateCropperTransform = () => {
    const imageEl = cropperImageRef.value;
    if (!imageEl) return;
    const { x, y, scale } = cropperState.value;
    imageEl.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`;
  };

  // Eventos del cropper
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  const onMouseDown = (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    cropperImageRef.value.style.cursor = 'grabbing';
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    cropperState.value.x += dx;
    cropperState.value.y += dy;
    startX = e.clientX;
    startY = e.clientY;
    updateCropperTransform();
  };

  const onMouseUp = () => {
    isDragging = false;
    if (cropperImageRef.value) {
      cropperImageRef.value.style.cursor = 'move';
    }
  };

  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(3, cropperState.value.scale + delta));
    cropperState.value.scale = newScale;
    updateCropperTransform();
  };

  // Adjuntar eventos del cropper
  const attachCropperEvents = () => {
    const imageEl = cropperImageRef.value;
    if (!imageEl) return;

    imageEl.addEventListener('mousedown', onMouseDown);
    imageEl.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Remover eventos del cropper
  const removeCropperEvents = () => {
    const imageEl = cropperImageRef.value;
    if (imageEl) {
      imageEl.removeEventListener('mousedown', onMouseDown);
      imageEl.removeEventListener('wheel', onWheel);
      imageEl.style.cursor = '';
    }
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  // Preparar cropper para edición
  const prepareCropper = () => {
    initCropper();
    // Pequeño delay para asegurar DOM actualizado
    setTimeout(attachCropperEvents, 50);
  };

  // Cancelar crop
  const cancelCrop = () => {
    showCropperModal.value = false;
    selfieFile.value = null;
    removeCropperEvents();
    resetCropperState();
    clearFileInput();
  };

  // Limpiar input file
  const clearFileInput = () => {
    const input = document.getElementById('selfie-input');
    if (input) input.value = '';
  };

  // Confirmar crop - algoritmo mejorado
  const confirmCrop = () => {
    return new Promise((resolve) => {
      const imageEl = cropperImageRef.value;
      const wrapperEl = cropperWrapperRef.value;

      if (!imageEl || !wrapperEl) {
        resolve(null);
        return;
      }

      // Forzar repaint
      void imageEl.offsetWidth;

      const wrapperWidth = wrapperEl.clientWidth;
      const wrapperHeight = wrapperEl.clientHeight;
      const { x, y, scale } = cropperState.value;

      // Calcular escala base para que la imagen quepa en el wrapper
      const scaleToFitX = wrapperWidth / imageEl.naturalWidth;
      const scaleToFitY = wrapperHeight / imageEl.naturalHeight;
      const scaleToFit = Math.min(scaleToFitX, scaleToFitY);

      // Dimensiones visuales de la imagen
      const displayWidth = imageEl.naturalWidth * scaleToFit * scale;
      const displayHeight = imageEl.naturalHeight * scaleToFit * scale;

      // Posición visual de la imagen
      const imgLeft = (wrapperWidth - displayWidth) / 2 + x;
      const imgTop = (wrapperHeight - displayHeight) / 2 + y;

      // Área de recorte (círculo 200x200 centrado)
      const cropLeft = (wrapperWidth - CROP_SIZE) / 2;
      const cropTop = (wrapperHeight - CROP_SIZE) / 2;

      // Convertir a coordenadas de la imagen original
      const sourceX = (cropLeft - imgLeft) / (scaleToFit * scale);
      const sourceY = (cropTop - imgTop) / (scaleToFit * scale);
      const sourceW = CROP_SIZE / (scaleToFit * scale);
      const sourceH = CROP_SIZE / (scaleToFit * scale);

      // Valores finales con clamping
      const sx = Math.max(0, sourceX);
      const sy = Math.max(0, sourceY);
      const sw = Math.min(imageEl.naturalWidth - sx, sourceW);
      const sh = Math.min(imageEl.naturalHeight - sy, sourceH);

      // Crear canvas y recorte
      const canvas = document.createElement('canvas');
      canvas.width = CROP_SIZE;
      canvas.height = CROP_SIZE;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageEl, sx, sy, sw, sh, 0, 0, CROP_SIZE, CROP_SIZE);

      canvas.toBlob((blob) => {
        croppedImageBlob.value = blob;
        removeCropperEvents();
        showCropperModal.value = false;
        clearFileInput();
        resolve(blob);
      }, 'image/jpeg', 0.92);
    });
  };

  // Subir selfie al backend
  const uploadSelfie = async () => {
    const blob = croppedImageBlob.value;
    if (!blob) return false;

    uploadingSelfie.value = true;

    try {
      // Convertir a base64
      const base64 = await blobToBase64(blob);

      const response = await api.post('/profile/selfie', {
        selfie_data: base64,
        mime_type: 'image/jpeg'
      });

      selfieFile.value = null;
      croppedImageBlob.value = null;

      // Recargar selfie
      await checkSelfie();

      onSuccess?.(response.message || 'Selfie actualizada correctamente');
      return true;
    } catch (e) {
      const msg = e.response?.data?.message || 'Error al subir la selfie';
      onError?.(msg);
      return false;
    } finally {
      uploadingSelfie.value = false;
    }
  };

  // Convertir blob a base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  };

  // Eliminar selfie
  const deleteSelfie = async () => {
    if (!userHasSelfie.value) return false;

    try {
      await api.delete('/profile/selfie');
      userHasSelfie.value = false;
      cleanupAllBlobs();
      onSuccess?.('Selfie eliminada correctamente');
      return true;
    } catch (e) {
      const msg = e.response?.data?.message || 'Error al eliminar la selfie';
      onError?.(msg);
      return false;
    }
  };

  // Cleanup al unmount
  onUnmounted(() => {
    removeCropperEvents();
    cleanupAllBlobs();
  });

  // Exponer API pública
  return {
    // Estado
    selfieFile,
    uploadingSelfie,
    showCropperModal,
    croppedImageBlob,
    showDeleteConfirm,
    userHasSelfie,
    selfieBlobUrl,
    cropperState,
    cropperImageSrc,

    // Refs para el template
    cropperImageRef,
    cropperWrapperRef,

    // Métodos
    checkSelfie,
    handleSelfieSelect,
    prepareCropper,
    confirmCrop,
    cancelCrop,
    uploadSelfie,
    deleteSelfie,

    // Utilidades
    cleanupAllBlobs
  };
}