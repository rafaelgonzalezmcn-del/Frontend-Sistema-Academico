/**
 * ToastService - Servicio Centralizado de Notificaciones
 * Fase 1.1: Manejo Centralizado de Errores en Frontend
 * 
 * Proporciona métodos uniformes para mostrar notificaciones toast
 * con soporte para diferentes tipos: success, error, warning, info
 */

class ToastService {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.defaultDuration = 4000;
  }

  /**
   * Inicializa el contenedor de toasts si no existe
   */
  _initContainer() {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.id = 'toast-service-container';
    
    // Estilos del contenedor
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Estilos globales de toasts (inyectados una sola vez)
    if (!document.getElementById('toast-service-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-service-styles';
      style.textContent = `
        @keyframes toast-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toast-slide-out {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        .toast-item {
          padding: 14px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          color: white;
          font-size: 14px;
          line-height: 1.4;
          animation: toast-slide-in 0.3s ease-out;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .toast-item.toast-removing {
          animation: toast-slide-out 0.3s ease-in forwards;
        }
        .toast-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .toast-error { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
        .toast-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .toast-info { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
        .toast-close {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0;
          font-size: 18px;
          line-height: 1;
          opacity: 0.8;
        }
        .toast-close:hover { opacity: 1; }
        .toast-icon { font-size: 20px; }
        .toast-content { flex: 1; }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(this.container);
  }

  /**
   * Mapeo de códigos HTTP a mensajes amigables
   */
  _httpErrorMessages = {
    400: 'Solicitud incorrecta. Verifica los datos enviados.',
    401: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
    403: 'No tienes permiso para realizar esta acción.',
    404: 'El recurso solicitado no fue encontrado.',
    409: 'Ya existe un registro similar. Verifica la información.',
    422: 'Los datos enviados no son válidos. Revisa los campos marcados.',
    429: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
    500: 'Error interno del servidor. Intenta más tarde.',
    503: 'Servicio temporalmente no disponible. Intenta más tarde.',
    0: 'No se pudo conectar con el servidor. Verifica tu conexión.'
  };

  /**
   * Obtiene el icono según el tipo de toast
   */
  _getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || 'ℹ';
  }

  /**
   * Mapea código HTTP a tipo de toast apropiado
   */
  _getTypeFromStatus(status) {
    if (status === 401) return 'error';
    if (status === 403) return 'warning';
    if (status === 409) return 'warning';
    if (status >= 400 && status < 500) return 'warning';
    if (status >= 500) return 'error';
    return 'error';
  }

  /**
   * Crea un elemento toast
   */
  _createToastElement(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${this._getIcon(type)}</span>
      <span class="toast-content">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    return toast;
  }

  /**
   * Muestra un toast
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo: success, error, warning, info
   * @param {number} duration - Duración en ms (0 = manual)
   */
  _show(message, type = 'info', duration = null) {
    this._initContainer();
    
    const toast = this._createToastElement(message, type);
    this.container.appendChild(toast);
    this.toasts.push(toast);

    const actualDuration = duration !== null ? duration : this.defaultDuration;
    
    if (actualDuration > 0) {
      setTimeout(() => {
        this._remove(toast);
      }, actualDuration);
    }

    return toast;
  }

  /**
   * Elimina un toast con animación
   */
  _remove(toast) {
    if (!toast || !toast.parentElement) return;
    
    toast.classList.add('toast-removing');
    setTimeout(() => {
      toast.remove();
      const index = this.toasts.indexOf(toast);
      if (index > -1) this.toasts.splice(index, 1);
    }, 300);
  }

  // ============================================
  // MÉTODOS PÚBLICOS
  // ============================================

  /**
   * Muestra toast de éxito
   */
  success(message, duration) {
    return this._show(message, 'success', duration);
  }

  /**
   * Muestra toast de error
   */
  error(message, duration) {
    return this._show(message, 'error', duration);
  }

  /**
   * Muestra toast de advertencia
   */
  warning(message, duration) {
    return this._show(message, 'warning', duration);
  }

  /**
   * Muestra toast informativo
   */
  info(message, duration) {
    return this._show(message, 'info', duration);
  }

  /**
   * Muestra error HTTP con mensaje amigable basado en código de estado
   * @param {number} status - Código de estado HTTP
   * @param {string} customMessage - Mensaje personalizado opcional
   */
  httpError(status, customMessage = null) {
    const message = customMessage || this._httpErrorMessages[status] || 
                    this._httpErrorMessages[0];
    const type = this._getTypeFromStatus(status);
    return this._show(message, type);
  }

  /**
   * Muestra error desde objeto de error de axios
   * @param {object} error - Error de axios
   */
  showFromError(error) {
    // Determinar el mensaje
    let message = 'Ocurrió un error inesperado.';
    let status = 0;

    if (error.response) {
      // Error de servidor con respuesta
      status = error.response.status;
      message = error.response.data?.message || 
                this._httpErrorMessages[status] || 
                this._httpErrorMessages[0];
    } else if (error.request) {
      // Error de red - no hubo respuesta
      status = 0;
      message = this._httpErrorMessages[0];
    }

    const type = this._getTypeFromStatus(status);
    return this._show(message, type);
  }

  /**
   * Cierra todos los toasts activos
   */
  clearAll() {
    this.toasts.forEach(toast => toast.remove());
    this.toasts = [];
  }
}

// Instancia singleton
const toastService = new ToastService();

// Exportar como objeto con métodos estáticos para facilidad de uso
export const toast = {
  success: (message, duration) => toastService.success(message, duration),
  error: (message, duration) => toastService.error(message, duration),
  warning: (message, duration) => toastService.warning(message, duration),
  info: (message, duration) => toastService.info(message, duration),
  httpError: (status, customMessage) => toastService.httpError(status, customMessage),
  showFromError: (error) => toastService.showFromError(error),
  clearAll: () => toastService.clearAll()
};

export default toastService;