<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { apiNormalized, api } from '@/services/apiNormalized';
import EntregaService from '@/services/EntregaService';
import ParcialService from '@/services/ParcialService';

// Composables - Fase 1: Pendiente migración completa
// MOTIVO: useTareas usa api (raw axios) vs apiNormalized (wrapper),
// diferente manejo de respuestas y errores que el template espera.
// La migración completa requiere cambios sincronizados en template + script.
// Por ahora se mantienen las funciones inline que funcionan correctamente.
// import { useTareas } from '@/composables/tareas/useTareas';
// import { useParciales } from '@/composables/useParciales';
// import { useNotas } from '@/composables/notas/useNotas';
// import { useMateriales } from '@/composables/useMateriales';
// import { useEntregas } from '@/composables/useEntregas';

// Componentes
import ParticipantesSection from './components/ParticipantesSection.vue';
import ModulosSection from './components/ModulosSection.vue';
import PdfViewerModal from '@/views/shared/components/modals/PdfViewerModal.vue';
import UploadFormModal from './components/modals/UploadFormModal.vue';
import NotasSection from '@/views/shared/components/notas/NotasSection.vue';
import TareasSection from '@/views/shared/components/tareas/TareasSection.vue';
import CloseCourseButton from './components/CloseCourseButton.vue';

// Estilos
import './MateriaProfesor.css';

const route = useRoute();
const router = useRouter();
const { user } = useAuth();

const loading = ref(true);
const error = ref('');
const materiaId = computed(() => Number(route.params.id));
const sectionId = computed(() => {
  // Leer sectionId de la query string (e.g., ?section=2)
  const sectionFromQuery = route.query.section;
  if (sectionFromQuery) {
    return Number(sectionFromQuery);
  }
  // Fallback: usar la primera sección disponible
  return sections.value.length > 0 ? sections.value[0].id : null;
});

// Computed para obtener la sección actual
const currentSection = computed(() => {
  if (!sectionId.value || sections.value.length === 0) return null;
  return sections.value.find(s => s.id === sectionId.value);
});

// Computed para mostrar el paralelo (ej: "3er Grado - Sección C")
const paraleloDisplay = computed(() => {
  const section = currentSection.value;
  if (!section) return '';
  return `${section.grade || 'Grado'} - Sección ${section.name}`;
});

// Datos
const materia = ref(null);
const sections = ref([]);
const modulos = ref([]);

// Estados de UI
const showAddModule = ref(false);
const newModuleName = ref('');
const newModuleDescription = ref('');
const savingModule = ref(false);

// Estado de edición inline
const editingModuleId = ref(null);
const editingModuleName = ref('');
const editingModuleDescription = ref('');
const savingEdit = ref(false);

// Estado de módulos colapsados
const modulosColapsados = ref({});

// Sidebar
const sidebarAbierto = ref(false);
const modulosExpandidosSidebar = ref({});

const toggleModuloSidebar = (moduloId) => {
  modulosExpandidosSidebar.value[moduloId] = !modulosExpandidosSidebar.value[moduloId];
};

const irAMaterial = (moduloId, material) => {
  // Cerrar sidebar en móvil
  sidebarAbierto.value = false;
  
  // Primero expandir el módulo si está colapsado
  modulosColapsados.value[moduloId] = false;
  
  // Scroll al módulo
  setTimeout(() => {
    const elemento = document.getElementById('modulo-' + moduloId);
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
};

// Estado de subida de archivos
const fileInput = ref(null);

// Materiales - Counts por módulo
const materialCounts = ref({});

// Modal de visor PDF
const showPdfViewer = ref(false);
const pdfUrl = ref('');
const pdfTitle = ref('');

// Formulario de subida de archivo
const showUploadForm = ref(false);
const uploadFormModuloId = ref(null);
const uploadFileName = ref('');
const uploadDescription = ref('');
const uploadFile = ref(null);
const uploadingForm = ref(false);

// Sistema de pestañas
const pestanaActiva = ref('curso');
const participantes = ref([]);
const loadingParticipantes = ref(false);

// Tareas
const tareas = ref({}); // { moduloId: [tareas] }
const loadingTareas = ref(false);
const showAddTarea = ref(false);
const newTareaModuloId = ref(null);
const newTareaTitulo = ref('');
const newTareaDescripcion = ref('');
const newTareaFechaLimite = ref('');
const newTareaPuntajeMaximo = ref(100);
const newTareaArchivo = ref(null);
const savingTarea = ref(false);
const editingTareaId = ref(null);
const editingTareaData = ref({});
const editingTareaArchivo = ref(null);

// Parciales y parámetros
const parciales = ref([]);
const parametros = ref([]);
const newTareaParcialId = ref(null);
const newTareaParametroId = ref(null);
const loadingParciales = ref(false);

// Notas
const notasData = ref([]);
const notasParciales = ref([]);
const loadingNotas = ref(false);
const showConfigParcial = ref(false);
const newParcialData = ref({ nombre: '', numero: 1, modulo_id: null, nota_maxima: 100 });
const newParametroData = ref({ nombre: '', tipo: 'tareas', porcentaje: 0, nota_maxima_default: 100 });

// Notas - Acordeón expandido
const notasEstudiantesExpandidos = ref({}); // { estudianteId: boolean }
const notasParcialesExpandidos = ref({}); // { "estudianteId-parcialId": boolean }
const notasParametrosExpandidos = ref({}); // { "estudianteId-parcialId-parametroId": boolean }
const notasTareasCargadas = ref({}); // { parametroId: [tareas] }

// Notas - Tabla estilo Moodle
const estudianteSeleccionadoId = ref(null);

// Resumen de entregas por tarea
const entregasResumen = ref({}); // { tareaId: { total_entregados, total_faltan, total_estudiantes } }

// Fetch resumen de entregas para una tarea
const fetchEntregasResumen = async (tareaId) => {
  try {
    // EntregaService ya devuelve respuesta normalizada
    const response = await EntregaService.obtenerEntregasTarea(tareaId);
    // Los campos especiales vienen en response.raw.data
    if (response.raw?.data?.resumen) {
      entregasResumen.value[tareaId] = response.raw.data.resumen;
    }
  } catch (e) {
    console.error('Error fetching entregas resumen:', e);
  }
};

// Fetch todos los resúmenes de entregas
const fetchAllEntregasResumen = async () => {
  for (const moduloId in tareas.value) {
    const tareasModulo = tareas.value[moduloId];
    if (tareasModulo && tareasModulo.length > 0) {
      for (const tarea of tareasModulo) {
        await fetchEntregasResumen(tarea.id);
      }
    }
  }
};

// Fetch tareas for a modulo
const fetchTareas = async (moduloId) => {
  try {
    // El servicio ahora devuelve respuesta normalizada
    const response = await apiNormalized.get(`/modulos/${moduloId}/tareas`);
    tareas.value[moduloId] = response.data || [];
  } catch (e) {
    console.error('Error fetching tareas:', e);
  }
};

// Fetch all tareas for all modulos
const fetchAllTareas = async () => {
  loadingTareas.value = true;
  try {
    for (const modulo of modulos.value) {
      await fetchTareas(modulo.id);
    }
    // Cargar resumen de entregas para cada tarea
    await fetchAllEntregasResumen();
  } finally {
    loadingTareas.value = false;
  }
};

// Create task
const createTarea = async () => {
  if (!newTareaTitulo.value.trim() || !newTareaFechaLimite.value) return;
  
  try {
    savingTarea.value = true;
    
    const formData = new FormData();
            formData.append('titulo', newTareaTitulo.value);
            formData.append('descripcion', newTareaDescripcion.value || '');
            formData.append('fecha_limite', newTareaFechaLimite.value);
            formData.append('modulo_id', newTareaModuloId.value);
            formData.append('puntaje_maximo', newTareaPuntajeMaximo.value);
            if (newTareaParcialId.value) {
              formData.append('parcial_id', newTareaParcialId.value);
            }
            if (newTareaParametroId.value) {
              formData.append('parametro_id', newTareaParametroId.value);
            }
            
            if (newTareaArchivo.value) {
              formData.append('archivo', newTareaArchivo.value);
            }
            
            // El servicio ahora devuelve respuesta normalizada
            const response = await apiNormalized.post('/tareas', formData);
            
            // Agregar a la lista
            if (!tareas.value[newTareaModuloId.value]) {
              tareas.value[newTareaModuloId.value] = [];
            }
            tareas.value[newTareaModuloId.value].push(response.data);
            
            // Reset form
              newTareaTitulo.value = '';
              newTareaDescripcion.value = '';
              newTareaFechaLimite.value = '';
              newTareaPuntajeMaximo.value = 100;
              newTareaArchivo.value = null;
              newTareaModuloId.value = null;
              newTareaParcialId.value = null;
              newTareaParametroId.value = null;
              parametros.value = [];
            showAddTarea.value = false;
    
    // Reset file input
    const fileInput = document.getElementById('tarea-archivo-input');
    if (fileInput) fileInput.value = '';
  } catch (e) {
    console.error('Error creating tarea:', e);
    error.value = e.response?.data?.message || 'Error al crear la tarea';
  } finally {
    savingTarea.value = false;
  }
};

// Handle file selection
const handleTareaFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    newTareaArchivo.value = file;
  }
};

// Cargar parciales - si se pasa un moduloId específico lo usa, sino usa el primero
const cargarParciales = async (moduloId = null) => {
  // Usar el módulo proporcionado o el primero disponible
  const targetModuloId = moduloId || (modulos.value.length > 0 ? modulos.value[0].id : null);
  
  if (!targetModuloId) {
    parciales.value = [];
    return;
  }
  
  try {
    loadingParciales.value = true;
    // ParcialService ya devuelve respuesta normalizada
    const response = await ParcialService.obtenerParciales(targetModuloId);
    parciales.value = response.data || [];
  } catch (e) {
    console.error('Error cargando parciales:', e);
    parciales.value = [];
  } finally {
    loadingParciales.value = false;
  }
};

// Cargar parámetros cuando cambia el parcial
const onParcialChange = async () => {
  newTareaParametroId.value = null;
  parametros.value = [];
  newTareaPuntajeMaximo.value = 100;
  
  if (!newTareaParcialId.value) return;
  
  try {
    // Obtener los parámetros y también la nota_maxima del parcial
    // ParcialService ya devuelve respuesta normalizada
    const response = await ParcialService.obtenerParametros(newTareaParcialId.value);
    parametros.value = response.data || [];
    
    // Buscar el parcial en notasParciales para obtener su nota_maxima
    const parcial = notasParciales.value.find(p => p.id === newTareaParcialId.value);
    if (parcial && parcial.nota_maxima) {
      newTareaPuntajeMaximo.value = parcial.nota_maxima;
    }
  } catch (e) {
    console.error('Error cargando parámetros:', e);
    parametros.value = [];
  }
};

// Cargar parámetros para edición
const parametrosEdicion = ref([]);
const cargarParametrosEdicion = async (parcialId) => {
  try {
    // ParcialService ya devuelve respuesta normalizada
    const response = await ParcialService.obtenerParametros(parcialId);
    parametrosEdicion.value = response.data || [];
  } catch (e) {
    console.error('Error cargando parámetros:', e);
    parametrosEdicion.value = [];
  }
};

// Cambiar parcial en edición
const onEditParcialChange = async () => {
  editingTareaData.value.parametro_id = null;
  parametrosEdicion.value = [];
  
  if (editingTareaData.value.parcial_id) {
    await cargarParametrosEdicion(editingTareaData.value.parcial_id);
  }
};

// Nota máxima sugerida basada en el parámetro seleccionado
const notaMaximaSugerida = computed(() => {
  if (!newTareaParametroId.value) return null;
  const param = parametros.value.find(p => p.id === newTareaParametroId.value);
  return param?.nota_maxima_default || null;
});

// Cargar notas del módulo
const cargarNotas = async () => {
  // Usar el primer módulo disponible si existe
  const primerModuloId = modulos.value.length > 0 ? modulos.value[0].id : null;
  
  if (!primerModuloId) {
    console.warn('No hay módulos disponibles para cargar notas');
    notasData.value = [];
    notasParciales.value = [];
    return;
  }
  
  try {
    loadingNotas.value = true;
    // ParcialService ya devuelve respuesta normalizada
    const response = await ParcialService.obtenerResumenNotas(primerModuloId);
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

// Crear parcial
const crearParcial = async () => {
  const primerModuloId = modulos.value.length > 0 ? modulos.value[0].id : null;
  if (!newParcialData.value.nombre || !primerModuloId) return;
  try {
    await ParcialService.crearParcial({
      ...newParcialData.value,
      modulo_id: primerModuloId
    });
    await cargarParciales();
    await cargarNotas();
    showConfigParcial.value = false;
    newParcialData.value = { nombre: '', numero: 1, modulo_id: null, nota_maxima: 100 };
  } catch (e) {
    console.error('Error creando parcial:', e);
    alert('Error al crear el parcial');
  }
};

// Crear parámetro
const crearParametro = async (parcialId) => {
  try {
    // Map tipo to nombre
    const tipoNombreMap = {
      'actividades_clase': 'Actividades en clase',
      'tareas': 'Tareas',
      'actuacion': 'Actuación',
      'examenes': 'Exámenes'
    };
    
    // Validar que tenga nombre
    if (!newParametroData.value.nombre?.trim()) {
      alert('Escribe un nombre para el parámetro');
      return;
    }
    
    await ParcialService.crearParametro(parcialId, {
      nombre: newParametroData.value.nombre,
      tipo: 'otro', // Tipo genérico para parámetros personalizados
      porcentaje: newParametroData.value.porcentaje || 0,
      nota_maxima_default: newParametroData.value.nota_maxima_default || 100
    });
    await cargarParciales();
    await cargarNotas();
    newParametroData.value = { nombre: '', tipo: 'tareas', porcentaje: 0, nota_maxima_default: 100 };
  } catch (e) {
    console.error('Error creando parámetro:', e);
    alert('Error al crear el parámetro');
  }
};

// Actualizar parámetro (porcentaje o nota máxima)
const actualizarParametro = async (parametro) => {
  try {
    await ParcialService.actualizarParametro(parametro.id, {
      porcentaje: parametro.porcentaje,
      nota_maxima_default: parametro.nota_maxima_default,
      nombre: parametro.nombre
    });
    // Recargar notas para actualizar
    await cargarNotas();
  } catch (e) {
    console.error('Error actualizando parámetro:', e);
    alert('Error al actualizar el parámetro');
  }
};

// Actualizar parcial (nota máxima)
const actualizarParcial = async (parcial) => {
  try {
    await ParcialService.actualizarParcial(parcial.id, {
      nombre: parcial.nombre,
      nota_maxima: parcial.nota_maxima
    });
    // Recargar notas para actualizar
    await cargarNotas();
  } catch (e) {
    console.error('Error actualizando parcial:', e);
    alert('Error al actualizar el parcial');
  }
};

// Calcular suma de porcentajes de un parcial
const sumaPorcentajes = (parcial) => {
  if (!parcial.parametros) return 0;
  return parcial.parametros.reduce((sum, p) => sum + (parseFloat(p.porcentaje) || 0), 0);
};

// Toggle estudiante en acordeón de notas
const toggleEstudianteNota = async (estudianteId) => {
  // Si se va a expandir, seleccionar ese estudiante
  if (!notasEstudiantesExpandidos.value[estudianteId]) {
    estudianteSeleccionadoId.value = estudianteId;
  }
  notasEstudiantesExpandidos.value[estudianteId] = !notasEstudiantesExpandidos.value[estudianteId];
};

// Toggle parcial en acordeón de notas
const toggleParcialNota = async (estudianteId, parcialId) => {
  const key = `${estudianteId}-${parcialId}`;
  notasParcialesExpandidos.value[key] = !notasParcialesExpandidos.value[key];
  
  // Si se expande, cargar las tareas de cada parámetro
  if (notasParcialesExpandidos.value[key]) {
    await cargarTareasParametros();
  }
};

// Toggle parámetro en acordeón de notas
const toggleParametroNota = (estudianteId, parcialId, parametroId) => {
  const key = `${estudianteId}-${parcialId}-${parametroId}`;
  notasParametrosExpandidos.value[key] = !notasParametrosExpandidos.value[key];
};

// Cargar tareas para los parámetros visibles
const cargarTareasParametros = async () => {
  try {
    // Obtener todos los IDs de parámetros que necesitan cargarse
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
    
    // Cargar tareas para cada parámetro
    for (const paramId of paramIds) {
      if (!notasTareasCargadas.value[paramId]) {
        // El servicio ahora devuelve respuesta normalizada
        const response = await apiNormalized.get(`/parametros/${paramId}/tareas`);
        notasTareasCargadas.value[paramId] = response.data || [];
      }
    }
  } catch (e) {
    console.error('Error cargando tareas de parámetros:', e);
  }
};

// Obtener icono para tipo de parámetro
const getParamIcon = (tipo) => {
  const icons = {
    'actividades_clase': '📝',
    'tareas': '📋',
    'actuacion': '🎭',
    'examenes': '📖'
  };
  return icons[tipo] || '📌';
};

// Calcular promedio general de notas
const calcularPromedioGeneral = () => {
  if (notasData.value.length === 0) return '0.00';
  const suma = notasData.value.reduce((acc, nota) => acc + (nota.nota_final || 0), 0);
  return (suma / notasData.value.length).toFixed(2);
};

// Obtener nota data por estudiante
const getNotaData = (estudianteId) => {
  if (!estudianteId) return null;
  return notasData.value.find(n => n.estudiante.id === estudianteId);
};

// Obtener nota final de un estudiante
const getNotaFinal = (estudianteId) => {
  if (!estudianteId) {
    // Mostrar promedio de todos
    if (notasData.value.length === 0) return '0.00';
    const suma = notasData.value.reduce((acc, nota) => acc + (nota.nota_final || 0), 0);
    return (suma / notasData.value.length).toFixed(2);
  }
  const nota = notasData.value.find(n => n.estudiante.id === estudianteId);
  return nota?.nota_final?.toFixed(2) || '0.00';
};

// Obtener nota de un parámetro específico
const getNotaParametro = (estudianteId, parcial, param) => {
  if (!estudianteId) return '-';
  const nota = notasData.value.find(n => n.estudiante.id === estudianteId);
  if (!nota || !nota.parciales) return '-';
  
  // Buscar el parcial en los datos de notas
  const notaParcial = nota.parciales.find(p => p.id === parcial.id);
  if (!notaParcial || !notaParcial.parametros) return '-';
  
  // Buscar el parámetro específico
  const notaParam = notaParcial.parametros.find(p => p.id === param.id);
  if (!notaParam || !notaParam.nota_parametro) return '-';
  
  return notaParam.nota_parametro.toFixed(2);
};

// Cambió estudiante seleccionado
const onEstudianteSeleccionadoChange = async () => {
  // Aquí podrías cargar más detalles si es necesario
};

// Obtener tareas de un parámetro
const getTareasParametro = (parametroId) => {
  if (!notasParciales.value) return [];
  
  for (const parcial of notasParciales.value) {
    if (parcial.parametros) {
      for (const param of parcial.parametros) {
        if (param.id === parametroId && param.tareas) {
          return param.tareas || [];
        }
      }
    }
  }
  return [];
};

// Obtener datos del estudiante seleccionado
const getEstudianteData = () => {
  if (!estudianteSeleccionadoId.value || !notasData.value) return null;
  return notasData.value.find(n => n.estudiante?.id === estudianteSeleccionadoId.value);
};

// Obtener nota del parámetro para el estudiante seleccionado
const getNotaParametroForEstudiante = (parametroId) => {
  const estudianteData = getEstudianteData();
  
  if (!estudianteData?.parciales) {
    return null;
  }
  
  for (const parcial of estudianteData.parciales) {
    if (parcial.parametros) {
      for (const param of parcial.parametros) {
        // Comparar como números
        if (Number(param.id) === Number(parametroId)) {
          return param;
        }
      }
    }
  }
  return null;
};

// Calcular ponderación de una tarea
// La nota ya viene en la escala del parcial (nota_maxima_parcial)
const calcularPonderacion = (tarea, param) => {
  if (!estudianteSeleccionadoId.value) return '-';
  
  const notaParam = getNotaParametroForEstudiante(param.id);
  if (!notaParam || typeof notaParam.nota_parametro !== 'number') return '-';
  
  // La nota viene en escala del parcial, la ponderación es: (nota / 100) * porcentaje
  const ponderacion = (notaParam.nota_parametro / 100) * param.porcentaje;
  return ponderacion.toFixed(2);
};

// Obtener calificación de una tarea
// La nota ya viene normalizada a escala 100
const obtenerCalificacionTarea = (tarea) => {
  if (!estudianteSeleccionadoId.value) return '-';
  
  const notaParam = getNotaParametroForEstudiante(tarea.parametro_id);
  if (!notaParam || typeof notaParam.nota_parametro !== 'number') return '-';
  
  return notaParam.nota_parametro.toFixed(2);
};

// Calcular porcentaje
const calcularPorcentaje = (tarea) => {
  return '100';
};

// Obtener total de un parámetro (nota del parámetro)
const obtenerTotalParametro = (parametroId) => {
  const notaParam = getNotaParametroForEstudiante(parametroId);
  
  // Verificar que existe y tiene valor numérico
  if (notaParam && typeof notaParam.nota_parametro === 'number') {
    return notaParam.nota_parametro.toFixed(2);
  }
  
  return '-';
};

// Obtener calificación ponderada
const obtenerCalificacionPonderada = (param) => {
  const notaParam = getNotaParametroForEstudiante(param.id);
  
  if (notaParam && typeof notaParam.nota_ponderada === 'number') {
    return notaParam.nota_ponderada.toFixed(2);
  }
  
  return '-';
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

// Obtener nota de un parcial específico
const obtenerNotaParcial = (notaData, parcialId) => {
  if (!notaData) return '0.00';
  const parcial = notaData.parciales?.find(p => Number(p.id) === Number(parcialId));
  if (!parcial || parcial.nota_final === null || parcial.nota_final === undefined) return '0.00';
  return parcial.nota_final.toFixed(2);
};

// Delete task
const deleteTarea = async (tareaId, moduloId) => {
  if (!confirm('¿Eliminar esta tarea?')) return;
  
  try {
    // El servicio ahora devuelve respuesta normalizada
    await apiNormalized.delete(`/tareas/${tareaId}`);
    tareas.value[moduloId] = tareas.value[moduloId].filter(t => t.id !== tareaId);
  } catch (e) {
    console.error('Error deleting tarea:', e);
    error.value = e.response?.data?.message || 'Error al eliminar la tarea';
  }
};

// Start editing tarea
const startEditTarea = async (tarea, moduloId) => {
  // Cargar parciales si no están cargados
  if (parciales.value.length === 0) {
    await cargarParciales(moduloId);
  }
  
  editingTareaId.value = tarea.id;
  
  // Formatear fecha para datetime-local (yyyy-MM-ddTHH:mm)
  let fechaFormateada = '';
  if (tarea.fecha_limite) {
    const fecha = new Date(tarea.fecha_limite);
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const hora = String(fecha.getHours()).padStart(2, '0');
    const minuto = String(fecha.getMinutes()).padStart(2, '0');
    fechaFormateada = `${año}-${mes}-${dia}T${hora}:${minuto}`;
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
  
  // Cargar parámetros si hay parcial seleccionado
  if (tarea.parcial_id) {
    await cargarParametrosEdicion(tarea.parcial_id);
  }
};

// Cancel editing
const cancelEditTarea = () => {
  editingTareaId.value = null;
  editingTareaData.value = {};
  editingTareaArchivo.value = null;
  parametrosEdicion.value = [];
};

// Save editing tarea
const saveEditTarea = async () => {
  if (!editingTareaData.value.titulo?.trim() || !editingTareaData.value.fecha_limite) return;
  
  try {
    savingTarea.value = true;
    
    const formData = new FormData();
    formData.append('titulo', editingTareaData.value.titulo);
    formData.append('descripcion', editingTareaData.value.descripcion || '');
    formData.append('fecha_limite', editingTareaData.value.fecha_limite);
    formData.append('puntaje_maximo', Number(editingTareaData.value.puntaje_maximo) || 100);
    formData.append('modulo_id', Number(editingTareaData.value.moduloId));
    
    // Solo enviar parcial_id si tiene valor válido
    if (editingTareaData.value.parcial_id && editingTareaData.value.parcial_id > 0) {
      formData.append('parcial_id', Number(editingTareaData.value.parcial_id));
    }
    // Solo enviar parametro_id si tiene valor válido
    if (editingTareaData.value.parametro_id && editingTareaData.value.parametro_id > 0) {
      formData.append('parametro_id', Number(editingTareaData.value.parametro_id));
    }
    
    if (editingTareaArchivo.value) {
      formData.append('archivo', editingTareaArchivo.value);
    }
    
    // El servicio ahora devuelve respuesta normalizada
    const response = await apiNormalized.put(`/tareas/${editingTareaId.value}`, formData);
    
    // Update in list
    const moduloId = editingTareaData.value.moduloId;
    const index = tareas.value[moduloId].findIndex(t => t.id === editingTareaId.value);
    if (index !== -1) {
      tareas.value[moduloId][index] = response.data;
    }
    
    cancelEditTarea();
  } catch (e) {
    console.error('Error updating tarea:', e);
    error.value = e.response?.data?.message || 'Error al actualizar la tarea';
  } finally {
    savingTarea.value = false;
  }
};

// Handle edit file selection
const handleEditTareaFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    editingTareaArchivo.value = file;
  }
};

// Download archivo
const downloadArchivo = async (tarea) => {
  try {
    // Usar api raw (no normalizado) para descargas
    const response = await api.get(`/tareas/${tarea.id}/descargar`);
    if (response.data.download_url) {
      window.open(response.data.download_url, '_blank');
    }
  } catch (e) {
    console.error('Error downloading archivo:', e);
    error.value = 'Error al descargar el archivo';
  }
};

// Navegar a ver entregas de una tarea
const verEntregasTarea = (tareaId) => {
  router.push(`/profesor/materia/${route.params.id}/tarea/${tareaId}`);
};

// Cargar datos
onMounted(async () => {
  await fetchModulos();
  await fetchAllTareas();
});

// Cambiar pestaña
const cambiarPestana = async (pestana) => {
  pestanaActiva.value = pestana;
  
  // Cargar participantes si se cambia a esa pestaña
  if (pestana === 'participantes' && participantes.value.length === 0) {
    await fetchParticipantes();
  }
  
  // Cargar notas si se cambia a esa pestaña
  if (pestana === 'notas') {
    await cargarNotas();
  }
};

// Obtener participantes
const fetchParticipantes = async () => {
  try {
    loadingParticipantes.value = true;
    // Pasar sectionId como query param para filtrar por sección específica
    const params = {};
    if (sectionId.value) {
      params.section_id = sectionId.value;
    }
    const response = await apiNormalized.get(`/subjects/${materiaId.value}/participantes`, { params });
    participantes.value = response.data || [];
  } catch (e) {
    console.error('Error fetching participantes:', e);
    error.value = 'Error al cargar participantes';
  } finally {
    loadingParticipantes.value = false;
  }
};

// Obtener iniciales del nombre
const getIniciales = (nombre) => {
  if (!nombre) return '?';
  const partes = nombre.split(' ');
  if (partes.length >= 2) {
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }
  return partes[0].substring(0, 2).toUpperCase();
};

const fetchModulos = async () => {
  try {
    loading.value = true;
    // El servicio ahora devuelve respuesta normalizada
    const response = await apiNormalized.get(`/materias/${materiaId.value}/modulos`);
    modulos.value = response.data || [];
    // La materia está en meta.materia según la respuesta de la API
    materia.value = response.meta?.materia || null;
    // Las secciones están en meta.sections
    sections.value = response.meta?.sections || [];
    
    // Contar materiales por módulo
    modulos.value.forEach(modulo => {
      materialCounts.value[modulo.id] = modulo.materiales?.length || 0;
    });
  } catch (e) {
    console.error('Error fetching modulos:', e);
    error.value = 'Error al cargar los módulos';
  } finally {
    loading.value = false;
  }
};

// Crear nuevo módulo
const createModule = async () => {
  if (!newModuleName.value.trim()) return;
  
  try {
    savingModule.value = true;
    // El servicio ahora devuelve respuesta normalizada
    const response = await apiNormalized.post('/modulos', {
      nombre: newModuleName.value,
      descripcion: newModuleDescription.value.trim() || null,
      materia_id: materiaId.value
    });
    
    modulos.value.push(response.data);
    newModuleName.value = '';
    newModuleDescription.value = '';
    showAddModule.value = false;
  } catch (e) {
    console.error('Error creating module:', e);
    error.value = e.response?.data?.message || 'Error al crear el módulo';
  } finally {
    savingModule.value = false;
  }
};

// Iniciar edición inline
const startEdit = (modulo) => {
  editingModuleId.value = modulo.id;
  editingModuleName.value = modulo.nombre;
  editingModuleDescription.value = modulo.descripcion || '';
};

// Cancelar edición
const cancelEdit = () => {
  editingModuleId.value = null;
  editingModuleName.value = '';
  editingModuleDescription.value = '';
};

// Guardar edición
const saveEdit = async (moduloId) => {
  if (!editingModuleName.value.trim()) return;
  
  try {
    savingEdit.value = true;
    // El servicio ahora devuelve respuesta normalizada
    await apiNormalized.put(`/modulos/${moduloId}`, {
      nombre: editingModuleName.value,
      descripcion: editingModuleDescription.value || null
    });
    
    // Actualizar el módulo en la lista
    const modulo = modulos.value.find(m => m.id === moduloId);
    if (modulo) {
      modulo.nombre = editingModuleName.value;
      modulo.descripcion = editingModuleDescription.value || null;
    }
    
    editingModuleId.value = null;
    editingModuleName.value = '';
    editingModuleDescription.value = '';
  } catch (e) {
    console.error('Error updating module:', e);
    error.value = e.response?.data?.message || 'Error al actualizar el módulo';
  } finally {
    savingEdit.value = false;
  }
};

// Eliminar módulo
const deleteModule = async (moduloId) => {
  if (!confirm('¿Estás seguro de eliminar este módulo? Se eliminarán todos los materiales.')) {
    return;
  }
  
  try {
    // El servicio ahora devuelve respuesta normalizada
    await apiNormalized.delete(`/modulos/${moduloId}`);
    modulos.value = modulos.value.filter(m => m.id !== moduloId);
  } catch (e) {
    console.error('Error deleting module:', e);
    error.value = e.response?.data?.message || 'Error al eliminar el módulo';
  }
};

// Mostrar formulario de subida
const showUploadModal = (moduloId) => {
  uploadFormModuloId.value = moduloId;
  showUploadForm.value = true;
  uploadFileName.value = '';
  uploadDescription.value = '';
  uploadFile.value = null;
  // NO longer auto-open file browser - user will select from modal
};

// Handle file selection from input
const handleFileSelect = (event, moduloId) => {
  const file = event.target.files[0];
  if (!file) {
    uploadFile.value = null;
    return;
  }
  
  // Validar extensión
  const allowedExtensions = ['.pdf', '.zip', '.doc', '.docx'];
  const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(fileExt)) {
    alert('Solo se permiten archivos PDF, ZIP o Word');
    event.target.value = '';
    uploadFile.value = null;
    return;
  }
  
  // Validar tamaño (8MB)
  if (file.size > 8 * 1024 * 1024) {
    alert('El archivo no puede superar 8MB');
    event.target.value = '';
    uploadFile.value = null;
    return;
  }
  
  uploadFile.value = file;
  // Pre-fill nombre con el nombre del archivo
  if (!uploadFileName.value) {
    uploadFileName.value = file.name.substring(0, file.name.lastIndexOf('.'));
  }
};

// Handle file selection from modal input
const handleModalFileSelect = (event) => {
  const file = event.target.files[0];
  if (!file) {
    uploadFile.value = null;
    return;
  }
  
  // Validar extensión
  const allowedExtensions = ['.pdf', '.zip', '.doc', '.docx'];
  const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(fileExt)) {
    alert('Solo se permiten archivos PDF, ZIP o Word');
    event.target.value = '';
    uploadFile.value = null;
    return;
  }
  
  // Validar tamaño (8MB)
  if (file.size > 8 * 1024 * 1024) {
    alert('El archivo no puede superar 8MB');
    event.target.value = '';
    uploadFile.value = null;
    return;
  }
  
  uploadFile.value = file;
  // Pre-fill nombre con el nombre del archivo
  if (!uploadFileName.value) {
    uploadFileName.value = file.name.substring(0, file.name.lastIndexOf('.'));
  }
};

// Submit upload with custom name and description
const submitUpload = async () => {
  if (!uploadFile.value || !uploadFileName.value.trim()) {
    alert('Selecciona un archivo y escribe un nombre');
    return;
  }
  
  const formData = new FormData();
  formData.append('archivo', uploadFile.value);
  formData.append('nombre_personalizado', uploadFileName.value.trim());
  formData.append('descripcion', uploadDescription.value.trim());
  
  try {
    uploadingForm.value = true;
    // El servicio ahora devuelve respuesta normalizada
    const response = await apiNormalized.post(`/modulos/${uploadFormModuloId.value}/materiales`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    // Agregar el material al módulo
    const modulo = modulos.value.find(m => m.id === uploadFormModuloId.value);
    if (modulo) {
      if (!modulo.materiales) modulo.materiales = [];
      modulo.materiales.push(response.data);
      materialCounts.value[uploadFormModuloId.value] = modulo.materiales.length;
    }
    
    // Cerrar formulario
    closeUploadForm();
    
    // Reset input file
    const input = document.getElementById(`file-input-${uploadFormModuloId.value}`);
    if (input) input.value = '';
  } catch (e) {
    console.error('Error uploading file:', e);
    error.value = e.response?.data?.message || 'Error al subir el archivo';
  } finally {
    uploadingForm.value = false;
  }
};

// Cerrar formulario de subida
const closeUploadForm = () => {
  showUploadForm.value = false;
  uploadFormModuloId.value = null;
  uploadFileName.value = '';
  uploadDescription.value = '';
  uploadFile.value = null;
  
  // Reset input
  if (uploadFormModuloId.value) {
    const input = document.getElementById(`file-input-${uploadFormModuloId.value}`);
    if (input) input.value = '';
  }
};

// Función legacy para compatibilidad
const triggerFileUpload = (moduloId) => {
  showUploadModal(moduloId);
};

// Eliminar material
const deleteMaterial = async (moduloId, materialId) => {
  if (!confirm('¿Eliminar este material?')) return;
  
  try {
    // El servicio ahora devuelve respuesta normalizada
    await apiNormalized.delete(`/materiales/${materialId}`);
    
    const modulo = modulos.value.find(m => m.id === moduloId);
    if (modulo && modulo.materiales) {
      modulo.materiales = modulo.materiales.filter(m => m.id !== materialId);
      materialCounts.value[moduloId] = modulo.materiales.length;
    }
  } catch (e) {
    console.error('Error deleting material:', e);
    error.value = e.response?.data?.message || 'Error al eliminar el material';
  }
};

// Ver/Download material - Si es PDF, mostrar visor; si no, descargar
const viewMaterial = async (material) => {
  const fileExt = material.nombre_archivo.toLowerCase().substring(material.nombre_archivo.lastIndexOf('.'));
  
  // Si es PDF, mostrar en visor
  if (fileExt === '.pdf') {
    // Usar la URL del backend
    pdfUrl.value = material.url;
    pdfTitle.value = material.nombre_archivo;
    showPdfViewer.value = true;
  } else {
    // Si no es PDF, descargar - usar api raw (no normalizado) para descargas
    try {
      const response = await api.get(`/materiales/${material.id}/descargar`);
      window.open(response.data.download_url, '_blank');
    } catch (e) {
      console.error('Error downloading:', e);
      error.value = 'Error al descargar el archivo';
    }
  }
};

// Cerrar visor PDF
const closePdfViewer = () => {
  showPdfViewer.value = false;
  pdfUrl.value = '';
  pdfTitle.value = '';
};

// Toggle módulo colapsado
const toggleModulo = (moduloId) => {
  modulosColapsados.value[moduloId] = !modulosColapsados.value[moduloId];
};

// Volver al dashboard
const goBack = () => {
  router.push('/profesor');
};
</script>

<template>
  <div class="materia-profesor">
    <!-- Header -->
    <div class="page-header">
      <button @click="goBack" class="btn-back">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        Volver
      </button>
      <div class="header-info">
        <h1>{{ materia?.name || 'Cargando...' }}</h1>
        <p v-if="paraleloDisplay" class="subtitle">{{ paraleloDisplay }} • Gestión de módulos y materiales</p>
        <p v-else class="subtitle">Gestión de módulos y materiales</p>
      </div>
      <!-- Botón para cerrar curso (sección seleccionada) -->
      <div v-if="sectionId" class="header-actions">
        <CloseCourseButton 
          :subject-id="materiaId"
          :section-id="sectionId"
        />
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-message">
      {{ error }}
      <button @click="error = ''" class="close-error">✕</button>
    </div>

    <!-- Loading -->
    <div v-if="loading && !materia" class="loading">Cargando...</div>

    <template v-else>
      <!-- Pestañas de navegación -->
      <div class="tabs-container">
        <button 
          class="tab-button" 
          :class="{ active: pestanaActiva === 'curso' }"
          @click="cambiarPestana('curso')"
        >
          📘 Curso
        </button>
        <button 
          class="tab-button" 
          :class="{ active: pestanaActiva === 'participantes' }"
          @click="cambiarPestana('participantes')"
        >
          👥 Participantes
        </button>
        <button 
          class="tab-button" 
          :class="{ active: pestanaActiva === 'notas' }"
          @click="cambiarPestana('notas')"
        >
          📝 Notas
        </button>
        <button 
          class="tab-button" 
          :class="{ active: pestanaActiva === 'tareas' }"
          @click="cambiarPestana('tareas')"
        >
          📋 Tareas
        </button>
      </div>

      <!-- Contenido según pestaña -->
      
      <!-- PESTAÑA: CURSO (Módulos) -->
      <ModulosSection 
        v-if="pestanaActiva === 'curso'"
        :modulos="modulos"
        :modulos-colapsados="modulosColapsados"
        :loading="loading"
        :show-add-module="showAddModule"
        :new-module-name="newModuleName"
        :new-module-description="newModuleDescription"
        :saving-module="savingModule"
        :editing-module-id="editingModuleId"
        :editing-module-name="editingModuleName"
        :editing-module-description="editingModuleDescription"
        :saving-edit="savingEdit"
        :material-counts="materialCounts"
        :materia-id="materiaId"
        @update:new-module-name="newModuleName = $event"
        @update:new-module-description="newModuleDescription = $event"
        @update:show-add-module="showAddModule = $event"
        @update:editing-module-name="editingModuleName = $event"
        @update:editing-module-description="editingModuleDescription = $event"
        @toggle-modulo="toggleModulo"
        @create-module="createModule"
        @start-edit="startEdit"
        @save-edit="saveEdit"
        @cancel-edit="cancelEdit"
        @delete-module="deleteModule"
        @view-material="viewMaterial"
        @delete-material="deleteMaterial"
        @show-upload-modal="showUploadModal"
        @file-selected="handleFileSelect"
      />
      
      <!-- PESTAÑA: PARTICIPANTES -->
      <ParticipantesSection 
        v-if="pestanaActiva === 'participantes'"
        :participantes="participantes"
        :loading-participantes="loadingParticipantes"
        :current-user-id="user?.id"
      />
       
       <!-- PESTAÑA: NOTAS -->
<NotasSection 
          v-if="pestanaActiva === 'notas'" 
          :modulos="modulos"
          mode="profesor"
       />
         
       <!-- PESTAÑA: TAREAS -->
<TareasSection 
          v-if="pestanaActiva === 'tareas'" 
          :modulos="modulos"
          :materia-id="materiaId"
          mode="profesor"
        />
  </template>
    
    <!-- Modal Visor PDF -->
    <div v-if="showPdfViewer" class="pdf-viewer-overlay" @click.self="closePdfViewer">
      <div class="pdf-viewer-modal">
        <div class="pdf-viewer-header">
          <h3>{{ pdfTitle }}</h3>
          <button class="pdf-viewer-close" @click="closePdfViewer">✕</button>
        </div>
        <div class="pdf-viewer-content">
          <iframe :src="pdfUrl" title="Visor PDF"></iframe>
        </div>
      </div>
    </div>
    
    <!-- Modal Subir Archivo -->
    <div v-if="showUploadForm" class="upload-form-overlay" @click.self="closeUploadForm">
      <div class="upload-form-modal">
        <div class="upload-form-header">
          <h3>Subir Archivo</h3>
          <button class="upload-form-close" @click="closeUploadForm">✕</button>
        </div>
        <div class="upload-form-body">
          <div class="form-group">
            <label>Nombre del archivo *</label>
            <input 
              v-model="uploadFileName" 
              type="text" 
              placeholder="Ej: Tema 1 - Introducción"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>Descripción (opcional)</label>
            <textarea 
              v-model="uploadDescription" 
              placeholder="Breve descripción del contenido..."
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>
          <div class="form-group">
            <label>Seleccionar archivo *</label>
            <input 
              type="file" 
              accept=".pdf,.zip,.doc,.docx"
              @change="handleModalFileSelect"
              class="form-input"
            />
          </div>
          <div v-if="uploadFile" class="file-selected">
            <span class="file-icon">📄</span>
            <span class="file-name">{{ uploadFile.name }}</span>
            <span class="file-size">({{ Math.round(uploadFile.size / 1024) }} KB)</span>
          </div>
          <div v-else class="no-file">
            Selecciona un archivo usando el botón
          </div>
        </div>
        <div class="upload-form-footer">
          <button @click="closeUploadForm" class="btn-cancel">Cancelar</button>
          <button 
            @click="submitUpload" 
            class="btn-submit"
            :disabled="!uploadFile || !uploadFileName.trim() || uploadingForm"
          >
            {{ uploadingForm ? 'Subiendo...' : 'Subir Archivo' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
