/**
 * Utilitarios de formato
 */

export const formatFecha = (fecha) => {
  if (!fecha) return '';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

export const getEstadoColor = (estado) => {
  if (estado === 'vencida') return '#ef4444';
  return '#f59e0b';
};

export const getParamIcon = (tipo) => {
  const icons = {
    'actividades_clase': '📝',
    'tareas': '📋',
    'actuacion': '🎭',
    'examenes': '📖'
  };
  return icons[tipo] || '📌';
};

export const getIniciales = (nombre) => {
  if (!nombre) return '?';
  const partes = nombre.split(' ');
  if (partes.length >= 2) {
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }
  return partes[0].substring(0, 2).toUpperCase();
};
