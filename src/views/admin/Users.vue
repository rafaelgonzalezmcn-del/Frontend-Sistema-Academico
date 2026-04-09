<script setup>
import { ref, onMounted, watch, computed, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiNormalized as api } from '../../services/apiNormalized';
import { api as apiRaw } from '../../services/apiNormalized';

const route = useRoute();
const router = useRouter();

// ─── Estado ──────────────────────────────────────────────────────
const users = ref([]);
const roles = ref([]);
const sections = ref([]);
const grades = ref([]);
const schoolYears = ref([]);
const loading = ref(true);
const error = ref({ message: '', type: '' });
const showModal = ref(false);
const editingUser = ref(null);

// Operaciones masivas
const selectedUsers = ref(new Set());
const isProcessing = ref(false);
const showBatchModal = ref(false);
const batchAction = ref('');
const batchSectionId = ref('');
const batchResult = ref(null);
const batchPreview = ref(null);

// Filtros
const filterRole = ref('');
const filterGrade = ref('');
const filterSchoolYear = ref('');
const filterSection = ref('');
const filterStatus = ref('');
const searchQuery = ref('');

// Paginación
const currentPage = ref(1);
const lastPage = ref(1);
const total = ref(0);

// Control de requests concurrentes
let abortController = null;

// Validación de cédula en tiempo real
const idCheck = ref({ checking: false, available: null, existingUser: null });
let idCheckTimeout = null;
let idCheckRequestId = 0;
const idCheckAbort = { current: null };

// Validación de email en tiempo real
const emailCheck = ref({ checking: false, available: null, existingUser: null });
let emailCheckTimeout = null;
let emailCheckRequestId = 0;
const emailCheckAbort = { current: null };

// F9-EX6, F9-H5: Cache temporal de consultas con TTL (5s)
const checkCache = new Map();
const CACHE_TTL = 5000;

// Persistencia
const STORAGE_KEY = 'admin_users_filters';

const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  identification_number: '',
  phone: '',
  role_id: '',
  section_id: '',
  activo: true
});

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Inicializa filtros desde query params de la URL (viene del dashboard)
 */
const initFiltersFromQuery = () => {
  if (route.query.role) filterRole.value = route.query.role;
  if (route.query.grade_id) filterGrade.value = String(route.query.grade_id);
  if (route.query.school_year_id) filterSchoolYear.value = String(route.query.school_year_id);
  if (route.query.section_id) filterSection.value = String(route.query.section_id);
  if (route.query.activo !== undefined) filterStatus.value = route.query.activo === '1' ? 'active' : 'inactive';
  // Filtros implícitos de estudiantes (unassigned y eligible solo aplican a estudiantes)
  if (route.query.unassigned || route.query.eligible) {
    filterRole.value = 'estudiante';
  }
};

/**
 * Construye los query params para la petición de usuarios
 */
const buildParams = () => {
  const params = { page: currentPage.value };
  if (filterRole.value) params.role = filterRole.value;
  if (filterGrade.value) params.grade_id = filterGrade.value;
  if (filterSchoolYear.value) params.school_year_id = filterSchoolYear.value;
  if (filterSection.value) params.section_id = filterSection.value;
  if (filterStatus.value !== '') params.activo = filterStatus.value === 'active' ? '1' : '0';
  if (searchQuery.value) params.search = searchQuery.value;
  // Soporte para filtros desde alertas del dashboard
  if (route.query.unassigned) params.unassigned = route.query.unassigned;
  if (route.query.eligible) params.eligible = route.query.eligible;
  return params;
};

/**
 * Clasifica un error de API en tipo + mensaje legible
 */
const classifyError = (e) => {
  if (!e.response) {
    return { type: 'network', message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.' };
  }

  const status = e.response.status;
  const serverMsg = e.response.data?.message;

  if (e.response.headers?.['content-type']?.includes('text/html')) {
    return { type: 'server', message: 'Error interno del servidor. Intenta de nuevo en unos momentos.' };
  }

  const errorMap = {
    401: { type: 'auth', message: 'Tu sesión expiró. Por favor, inicia sesión nuevamente.' },
    403: { type: 'auth', message: 'No tienes permiso para acceder a esta sección.' },
    404: { type: 'notfound', message: 'El recurso solicitado no existe.' },
    422: { type: 'validation', message: serverMsg || 'Los datos enviados no son válidos.' },
    500: { type: 'server', message: 'Error interno del servidor. Intenta de nuevo en unos momentos.' },
    503: { type: 'server', message: 'El servicio no está disponible temporalmente.' },
  };

  if (errorMap[status]) return errorMap[status];

  return { type: 'unknown', message: serverMsg || 'Ocurrió un error inesperado. Intenta de nuevo.' };
};

/**
 * Persiste el estado actual de filtros y página en localStorage
 */
const persistState = () => {
  try {
    const state = {
      page: currentPage.value,
      role: filterRole.value,
      grade: filterGrade.value,
      schoolYear: filterSchoolYear.value,
      section: filterSection.value,
      status: filterStatus.value,
      search: searchQuery.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded, modo privado, etc. */ }
};

/**
 * Restaura filtros y página desde localStorage.
 */
const restoreState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const state = JSON.parse(raw);
    if (typeof state !== 'object' || state === null) return;
    if (state.page && Number.isInteger(state.page) && state.page > 0) currentPage.value = state.page;
    if (typeof state.role === 'string') filterRole.value = state.role;
    if (typeof state.grade === 'string') filterGrade.value = state.grade;
    if (typeof state.schoolYear === 'string') filterSchoolYear.value = state.schoolYear;
    if (typeof state.section === 'string') filterSection.value = state.section;
    if (typeof state.status === 'string') filterStatus.value = state.status;
    if (typeof state.search === 'string') searchQuery.value = state.search;
  } catch {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
};

// ─── Fetch de catálogos (se carga UNA sola vez) ──────────────────

const catalogsLoaded = ref(false);

const fetchCatalogs = async () => {
  if (catalogsLoaded.value) return;
  try {
    const [rolesRes, gradesRes, sectionsRes, yearsRaw] = await Promise.all([
      api.get('/roles'),
      api.get('/grades'),
      api.get('/sections?per_page=100'),
      apiRaw.get('/school-years?per_page=100')
    ]);
    roles.value = rolesRes.data;
    grades.value = gradesRes.data;
    sections.value = sectionsRes.data;
    schoolYears.value = yearsRaw?.data?.data || [];
    catalogsLoaded.value = true;
  } catch (e) {
    // Los catálogos son opcionales — el fetch de usuarios puede funcionar sin ellos
    console.warn('Error cargando catálogos:', e);
  }
};

// ─── Fetch de usuarios ───────────────────────────────────────────

const fetchUsers = async () => {
  abortController?.abort();
  abortController = new AbortController();

  loading.value = true;
  error.value = { message: '', type: '' };

  try {
    const params = buildParams();

    const usersRes = await api.get('/users', { params, signal: abortController.signal });

    users.value = usersRes.data || [];

    if (usersRes.meta) {
      currentPage.value = usersRes.meta.current_page || 1;
      lastPage.value = usersRes.meta.last_page || 1;
      total.value = usersRes.meta.total || 0;
    }

    if (users.value.length === 0 && currentPage.value === 1) {
      error.value = { message: 'No se encontraron usuarios con los filtros actuales.', type: 'empty' };
    }

    persistState();
  } catch (e) {
    if (e.name === 'CanceledError' || e.name === 'AbortError') return;
    const classified = classifyError(e);
    error.value = { message: classified.message, type: classified.type };
  } finally {
    loading.value = false;
  }
};

// ─── Secciones y años filtrados por grado ─────────────────────────

/**
 * Años lectivos que tienen secciones del grado seleccionado.
 * Si no hay grado seleccionado, muestra todos los años.
 */
const filteredSchoolYears = computed(() => {
  if (!filterGrade.value) return schoolYears.value;
  // Obtener school_year_ids únicos de las secciones que pertenecen al grado seleccionado
  const yearIds = new Set(
    sections.value
      .filter(s => s.grade_id === Number(filterGrade.value))
      .map(s => s.school_year_id)
  );
  return schoolYears.value.filter(y => yearIds.has(y.id));
});

/**
 * Secciones filtradas por grado y año lectivo seleccionados.
 */
const filteredSections = computed(() => {
  let result = sections.value;
  if (filterGrade.value) {
    result = result.filter(s => s.grade_id === Number(filterGrade.value));
  }
  if (filterSchoolYear.value) {
    result = result.filter(s => s.school_year_id === Number(filterSchoolYear.value));
  }
  return result;
});

// ─── Reactividad de filtros ──────────────────────────────────────

const resetAndFetch = () => {
  currentPage.value = 1;
  fetchUsers();
};

// Cuando cambia grado: resetear año y sección si ya no son válidos
watch(filterGrade, () => {
  // Resetear año lectivo si el seleccionado no tiene secciones para este grado
  if (filterSchoolYear.value) {
    const validYearIds = new Set(
      sections.value
        .filter(s => s.grade_id === Number(filterGrade.value))
        .map(s => s.school_year_id)
    );
    if (!validYearIds.has(Number(filterSchoolYear.value))) {
      filterSchoolYear.value = '';
    }
  }
  // Resetear sección siempre (depende de grado + año)
  filterSection.value = '';
  currentPage.value = 1;
  fetchUsers();
});

// Cuando cambia año lectivo: resetear sección si ya no es válida
watch(filterSchoolYear, () => {
  if (filterSection.value) {
    const section = sections.value.find(s => s.id === Number(filterSection.value));
    if (!section || section.school_year_id !== Number(filterSchoolYear.value)) {
      filterSection.value = '';
    }
  }
  currentPage.value = 1;
  fetchUsers();
});

// Los demás filtros también resetean página
watch([filterRole, filterSection, filterStatus], resetAndFetch);

// Búsqueda con debounce (400ms)
let searchTimeout = null;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(resetAndFetch, 400);
});

// ─── Paginación ──────────────────────────────────────────────────

const scrollToTable = () => {
  const table = document.querySelector('.users-view .data-table');
  if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const goToPage = (page) => {
  if (page < 1 || page > lastPage.value) return;
  currentPage.value = page;
  scrollToTable();
  fetchUsers();
};

const prevPage = () => goToPage(currentPage.value - 1);
const nextPage = () => goToPage(currentPage.value + 1);

const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
  let end = Math.min(lastPage.value, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

// ─── Lógica de formulario dinámico por rol ───────────────────────

const selectedRoleName = computed(() => {
  if (!form.value.role_id) return '';
  const role = roles.value.find(r => r.id === form.value.role_id);
  return role?.name || '';
});

const showSectionField = computed(() => selectedRoleName.value === 'estudiante');
const showIdentificationField = computed(() => selectedRoleName.value === 'estudiante' || selectedRoleName.value === 'profesor');
const showPhoneField = computed(() => selectedRoleName.value === 'estudiante' || selectedRoleName.value === 'profesor');
const showLastNameField = computed(() => selectedRoleName.value !== 'admin');

const showSectionWarning = computed(() => {
  return selectedRoleName.value === 'estudiante' && !form.value.section_id && !editingUser.value;
});

const modalTitle = computed(() => {
  const prefix = editingUser.value ? 'Editar' : 'Nuevo';
  if (!selectedRoleName.value && !editingUser.value) return 'Nuevo Usuario';
  if (editingUser.value) {
    const roleName = getRoleName(selectedRoleName.value);
    return `${prefix} ${roleName}`;
  }
  switch (selectedRoleName.value) {
    case 'estudiante': return 'Nuevo Estudiante';
    case 'profesor': return 'Nuevo Profesor';
    case 'admin': return 'Nuevo Administrador';
    default: return 'Nuevo Usuario';
  }
});

// Resetear campos ocultos al cambiar de rol (solo en creación)
watch(() => form.value.role_id, (newRoleId) => {
  if (editingUser.value) return;
  const roleName = roles.value.find(r => r.id === newRoleId)?.name;
  if (roleName === 'admin') {
    form.value.section_id = '';
    form.value.identification_number = '';
    form.value.phone = '';
    form.value.last_name = '';
  } else if (roleName === 'profesor') {
    form.value.section_id = '';
  }
});

// ─── Validación de cédula y email en tiempo real ─────────────────

/**
 * Función genérica reutilizable para email y cédula.
 * Cada campo tiene su propio requestId independiente para evitar
 * que escribir en uno cancele la validación del otro.
 */
const checkAvailability = async ({ field, value, excludeUserId, stateRef, abortObj, requestIdRef }) => {
  if (!value || value.trim().length < 3) {
    stateRef.value = { checking: false, available: null, existingUser: null };
    return;
  }

  // No validar en edición si el valor no cambió
  if (editingUser.value) {
    const originalValue = field === 'email'
      ? editingUser.value.email
      : editingUser.value.identification_number;
    if (value === originalValue) {
      stateRef.value = { checking: false, available: null, existingUser: null };
      return;
    }
  }

  // Cache con TTL — incluir excludeUserId en la key para evitar falsos positivos
  const normalizedValue = field === 'email' ? value.toLowerCase().trim() : value.replace(/\D/g, '');
  const cacheKey = `${field}:${normalizedValue}:${excludeUserId || 'none'}`;
  const cached = checkCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    stateRef.value = { checking: false, ...cached.result };
    return;
  }

  // Race condition protection — requestId independiente por campo
  const requestId = ++requestIdRef.current;

  if (abortObj.current) abortObj.current.abort();
  abortObj.current = new AbortController();
  const signal = abortObj.current.signal;

  stateRef.value = { checking: true, available: null, existingUser: null };

  try {
    const params = { field, value };
    if (excludeUserId) params.exclude_user_id = excludeUserId;

    const res = await api.get('/users/check-availability', { params, signal });

    // Ignorar si otro request más reciente de ESTE campo ya se disparó
    if (requestId !== requestIdRef.current) return;

    const result = res.data.available
      ? { available: true, existingUser: null }
      : { available: false, existingUser: res.data.user };

    checkCache.set(cacheKey, { result, timestamp: Date.now() });
    stateRef.value = { checking: false, ...result };
  } catch (e) {
    if (e.name === 'CanceledError' || e.name === 'AbortError') return;
    if (requestId !== requestIdRef.current) return;
    stateRef.value = { checking: false, available: null, existingUser: null };
  }
};

// Contadores independientes por campo
const idCheckRid = { current: 0 };
const emailCheckRid = { current: 0 };

const checkIdentification = () => {
  clearTimeout(idCheckTimeout);
  idCheckTimeout = setTimeout(() => {
    checkAvailability({
      field: 'identification_number',
      value: form.value.identification_number,
      excludeUserId: editingUser.value?.id,
      stateRef: idCheck,
      abortObj: idCheckAbort,
      requestIdRef: idCheckRid,
    });
  }, 500);
};

const checkEmail = () => {
  clearTimeout(emailCheckTimeout);
  emailCheckTimeout = setTimeout(() => {
    checkAvailability({
      field: 'email',
      value: form.value.email,
      excludeUserId: editingUser.value?.id,
      stateRef: emailCheck,
      abortObj: emailCheckAbort,
      requestIdRef: emailCheckRid,
    });
  }, 500);
};

watch(() => form.value.identification_number, checkIdentification);
watch(() => form.value.email, checkEmail);

const viewExistingUser = (userId) => {
  if (userId) router.push(`/perfil/${userId}`);
};

const idCheckClass = computed(() => {
  if (idCheck.value.checking) return 'checking';
  if (idCheck.value.available === true) return 'available';
  if (idCheck.value.available === false) return 'taken';
  return '';
});

const idCheckText = computed(() => {
  if (idCheck.value.checking) return 'Verificando...';
  if (idCheck.value.available === true) return 'Cédula disponible';
  if (idCheck.value.available === false && idCheck.value.existingUser) {
    const roleName = getRoleName(idCheck.value.existingUser.role);
    return `Ya existe: ${idCheck.value.existingUser.name} (${roleName})`;
  }
  return '';
});

const emailCheckClass = computed(() => {
  if (emailCheck.value.checking) return 'checking';
  if (emailCheck.value.available === true) return 'available';
  if (emailCheck.value.available === false) return 'taken';
  return '';
});

const emailCheckText = computed(() => {
  if (emailCheck.value.checking) return 'Verificando...';
  if (emailCheck.value.available === true) return 'Email disponible';
  if (emailCheck.value.available === false && emailCheck.value.existingUser) {
    const roleName = getRoleName(emailCheck.value.existingUser.role);
    return `Ya existe: ${emailCheck.value.existingUser.name} (${roleName})`;
  }
  return '';
});

// ─── CRUD de usuarios ────────────────────────────────────────────

const isUnassignedFilter = computed(() => route.query.unassigned === '1');
const isEligibleFilter = computed(() => route.query.eligible === '1');
const isRoleFromDashboard = computed(() => !!route.query.role);
const dashboardRoleLabel = computed(() => {
  if (route.query.role === 'estudiante') return 'Estudiantes activos';
  if (route.query.role === 'profesor') return 'Profesores activos';
  return '';
});

const clearDashboardFilter = () => {
  router.push('/admin/usuarios');
  // No llamar fetchData() aquí — el watcher de route.query ya lo hará
  // O si no hay watcher de route, el router.push no dispara fetch automáticamente
  // Necesitamos fetch después de limpiar
  // Pero router.push es async, así que usamos nextTick o then
  router.isReady().then(() => fetchUsers());
};

// ─── Operaciones masivas ─────────────────────────────────────────

const BATCH_SELECTION_KEY = 'admin_users_batch_selection';

const loadPersistedSelection = () => {
  try {
    const saved = localStorage.getItem(BATCH_SELECTION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      selectedUsers.value = new Set(parsed);
    }
  } catch { /* ignore corrupt data */ }
};

const persistSelection = () => {
  try {
    if (selectedUsers.value.size > 0) {
      localStorage.setItem(BATCH_SELECTION_KEY, JSON.stringify(Array.from(selectedUsers.value)));
    } else {
      localStorage.removeItem(BATCH_SELECTION_KEY);
    }
  } catch { /* ignore quota errors */ }
};

loadPersistedSelection();

const toggleSelect = (userId) => {
  if (selectedUsers.value.has(userId)) {
    selectedUsers.value.delete(userId);
  } else {
    selectedUsers.value.add(userId);
  }
  selectedUsers.value = new Set(selectedUsers.value);
  persistSelection();
};

const selectAllOnPage = () => {
  const pageIds = users.value.map(u => u.id);
  pageIds.forEach(id => selectedUsers.value.add(id));
  selectedUsers.value = new Set(selectedUsers.value);
  persistSelection();
};

const deselectAllOnPage = () => {
  const pageIds = new Set(users.value.map(u => u.id));
  for (const id of selectedUsers.value) {
    if (pageIds.has(id)) selectedUsers.value.delete(id);
  }
  selectedUsers.value = new Set(selectedUsers.value);
  persistSelection();
};

const selectAll = () => {
  if (isAllSelected.value) {
    deselectAllOnPage();
  } else {
    selectAllOnPage();
  }
};

const isAllSelected = computed(() => users.value.length > 0 && users.value.every(u => selectedUsers.value.has(u.id)));

const isAnySelectedOnPage = computed(() => users.value.some(u => selectedUsers.value.has(u.id)));

const openBatchModal = async (action) => {
  batchAction.value = action;
  batchSectionId.value = '';
  batchResult.value = null;
  batchPreview.value = null;

  try {
    const userIds = Array.from(selectedUsers.value);
    const params = { user_ids: userIds };
    params.action = action === 'assign_section' ? 'assign_section' : 'deactivate';

    const res = await api.post('/admin/users/batch-preview', params);
    batchPreview.value = res.data.data;
  } catch {
    batchPreview.value = null;
  }

  showBatchModal.value = true;
};

const closeBatchModal = () => {
  showBatchModal.value = false;
  batchAction.value = '';
  batchSectionId.value = '';
  batchResult.value = null;
};

const executeBatch = async () => {
  if (selectedUsers.value.size === 0) return;

  isProcessing.value = true;
  try {
    const userIds = Array.from(selectedUsers.value);

    if (batchAction.value === 'assign_section') {
      const res = await api.patch('/admin/users/batch-assign-section', {
        user_ids: userIds,
        section_id: parseInt(batchSectionId.value),
      });
      batchResult.value = res.data.data;
    } else if (batchAction.value === 'deactivate') {
      const res = await api.patch('/admin/users/batch-deactivate', {
        user_ids: userIds,
      });
      batchResult.value = res.data.data;
    }

    selectedUsers.value = new Set();
    persistSelection();
    await fetchUsers();
  } catch (e) {
    error.value = { message: e.response?.data?.message || 'Error en operación masiva', type: 'server' };
  } finally {
    isProcessing.value = false;
  }
};

const openModal = (user = null) => {
  editingUser.value = user;
  form.value = user
    ? {
        first_name: user.first_name,
        last_name: user.last_name || '',
        email: user.email,
        password: '',
        identification_number: user.identification_number || '',
        phone: user.phone || '',
        role_id: user.role?.id,
        section_id: user.section?.id || '',
        activo: user.activo
      }
    : {
        first_name: '', last_name: '', email: '', password: '',
        identification_number: '', phone: '', role_id: '',
        section_id: '', activo: true
      };
  // Limpiar estados de validación al abrir modal
  idCheck.value = { checking: false, available: null, existingUser: null };
  emailCheck.value = { checking: false, available: null, existingUser: null };
  idCheckRid.current = 0;
  emailCheckRid.current = 0;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingUser.value = null;
  // Limpiar estados de validación al cerrar
  idCheck.value = { checking: false, available: null, existingUser: null };
  emailCheck.value = { checking: false, available: null, existingUser: null };
  idCheckRid.current = 0;
  emailCheckRid.current = 0;
};

const saveUser = async () => {
  try {
    if (!form.value.role_id) {
      error.value = { message: 'Debe seleccionar un rol para el usuario', type: 'validation' };
      return;
    }

    const data = { ...form.value };
    if (!data.role_id) data.role_id = null;
    if (!data.section_id) data.section_id = null;
    if (!data.identification_number) data.identification_number = null;
    if (editingUser.value && !data.password) delete data.password;

    if (editingUser.value) {
      await api.put(`/users/${editingUser.value.id}`, data);
    } else {
      await api.post('/users', data);
    }
    await fetchUsers();
    closeModal();
  } catch (e) {
    const classified = classifyError(e);
    error.value = { message: classified.message, type: classified.type };
  }
};

const deleteUser = async (id) => {
  if (!confirm('¿Desactivar este usuario?')) return;
  try {
    await api.delete(`/users/${id}`);
    await fetchUsers();
  } catch (e) {
    const classified = classifyError(e);
    error.value = { message: classified.message, type: classified.type };
  }
};

const getRoleName = (roleName) => {
  const names = { admin: 'Administrador', profesor: 'Profesor', estudiante: 'Estudiante' };
  return names[roleName] || roleName;
};

// ─── Ciclo de vida ───────────────────────────────────────────────

onMounted(() => {
  // 1. Aplicar filtros desde URL (dashboard drill-down)
  initFiltersFromQuery();
  // 2. Restaurar filtros guardados SOLO si no hay query params de dashboard
  if (!route.query.role && !route.query.unassigned && !route.query.eligible && !route.query.grade_id && !route.query.section_id) {
    restoreState();
  }
  // 3. Cargar catálogos UNA sola vez
  fetchCatalogs();
  // 4. Fetch de usuarios
  fetchUsers();
});

onUnmounted(() => {
  clearTimeout(searchTimeout);
  clearTimeout(idCheckTimeout);
  clearTimeout(emailCheckTimeout);
  abortController?.abort();
  if (idCheckAbort.current) idCheckAbort.current.abort();
  if (emailCheckAbort.current) emailCheckAbort.current.abort();
});
</script>

<template>
  <div class="users-view">
    <div class="page-header">
      <h2>Gestión de Usuarios</h2>
      <button @click="openModal()" class="btn-primary">+ Nuevo Usuario</button>
    </div>

    <div class="filters">
      <input v-model="searchQuery" type="text" placeholder="Buscar por nombre, email o cédula..." />
      <select v-model="filterRole">
        <option value="">Todos los roles</option>
        <option value="profesor">Profesores</option>
        <option value="estudiante">Estudiantes</option>
      </select>
      <select v-model="filterSchoolYear">
        <option value="">Todos los años</option>
        <option v-for="year in filteredSchoolYears" :key="year.id" :value="year.id">
          {{ year.name }}
        </option>
      </select>
      <select v-model="filterGrade">
        <option value="">Todos los grados</option>
        <option v-for="grade in grades" :key="grade.id" :value="grade.id">
          {{ grade.name }}
        </option>
      </select>
      <select v-model="filterSection">
        <option value="">Todas las secciones</option>
        <option v-for="section in filteredSections" :key="section.id" :value="section.id">
          {{ section.name }} ({{ section.schoolYear?.name || 'Sin año' }})
        </option>
      </select>
      <select v-model="filterStatus">
        <option value="">Todos los estados</option>
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
      </select>
    </div>

    <!-- Banner: filtro desde dashboard -->
    <div v-if="isRoleFromDashboard" class="filter-banner role">
      <span class="banner-icon">{{ route.query.role === 'estudiante' ? '🎓' : '👨‍🏫' }}</span>
      <span class="banner-text">Mostrando {{ dashboardRoleLabel }}</span>
      <button @click="clearDashboardFilter" class="banner-clear">✕ Limpiar filtro</button>
    </div>
    <div v-if="isUnassignedFilter" class="filter-banner">
      <span class="banner-icon">📋</span>
      <span class="banner-text">Mostrando estudiantes sin sección asignada</span>
      <button @click="clearDashboardFilter" class="banner-clear">✕ Limpiar filtro</button>
    </div>
    <div v-if="isEligibleFilter" class="filter-banner eligible">
      <span class="banner-icon">🎉</span>
      <span class="banner-text">Mostrando estudiantes elegibles para promoción</span>
      <button @click="clearDashboardFilter" class="banner-clear">✕ Limpiar filtro</button>
    </div>

    <div v-if="loading" class="loading">
      <span class="loading-spinner"></span>
      Cargando usuarios...
    </div>

    <div v-else-if="error.message && users.length === 0" class="error-message" :data-type="error.type">
      <span class="error-icon">{{ error.type === 'empty' ? '🔍' : error.type === 'auth' ? '🔒' : error.type === 'network' ? '📡' : '⚠️' }}</span>
      <p>{{ error.message }}</p>
      <button v-if="error.type !== 'empty'" @click="fetchUsers" class="btn-retry">Reintentar</button>
    </div>

    <template v-else>
    <!-- Barra de acciones masivas -->
    <div v-if="selectedUsers.size > 0" class="batch-bar">
      <span class="batch-count">{{ selectedUsers.size }} seleccionado(s)</span>
      <button @click="openBatchModal('assign_section')" class="btn-batch" :disabled="isProcessing">Asignar sección</button>
      <button @click="openBatchModal('deactivate')" class="btn-batch btn-batch-danger" :disabled="isProcessing">Desactivar</button>
      <button @click="selectedUsers = new Set()" class="btn-batch-clear">Limpiar selección</button>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th class="col-checkbox">
            <input type="checkbox" :checked="isAllSelected" @change="selectAll" />
          </th>
          <th>Nombre</th>
          <th>Cédula</th>
          <th>Email</th>
          <th>Rol</th>
          <th>Sección</th>
          <th>Grado</th>
          <th>Año Lectivo</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id" :class="{ 'row-selected': selectedUsers.has(user.id) }">
          <td class="col-checkbox">
            <input type="checkbox" :checked="selectedUsers.has(user.id)" @change="toggleSelect(user.id)" />
          </td>
          <td>{{ user.first_name }} {{ user.last_name }}</td>
          <td>{{ user.identification_number || '-' }}</td>
          <td>{{ user.email }}</td>
          <td>
            <span :class="['role-badge', user.role?.name]">
              {{ getRoleName(user.role?.name) }}
            </span>
          </td>
          <td>{{ user.section?.name || '-' }}</td>
          <td>{{ user.section?.grade?.name || '-' }}</td>
          <td>{{ user.section?.schoolYear?.name || '-' }}</td>
          <td>
            <span :class="['badge', user.activo ? 'badge-success' : 'badge-danger']">
              {{ user.activo ? 'Activo' : 'Inactivo' }}
            </span>
          </td>
          <td>
            <button @click="openModal(user)" class="btn-primary btn-sm">Editar</button>
            <button v-if="user.role?.name === 'estudiante'" @click="$router.push(`/admin/students/${user.id}/history`)" class="btn-secondary btn-sm">Ver historial</button>
            <button @click="deleteUser(user.id)" class="btn-danger btn-sm">Desactivar</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Controles de paginación -->
    <div v-if="lastPage > 1" class="pagination-container">
      <div class="pagination-info">
        Mostrando {{ users.length }} de {{ total }} usuarios
        <span v-if="lastPage > 1">— Página {{ currentPage }} de {{ lastPage }}</span>
      </div>
      <div class="pagination-controls">
        <button
          @click="prevPage"
          :disabled="currentPage === 1 || loading"
          class="btn-pagination"
          :class="{ disabled: currentPage === 1 || loading }"
        >
          &laquo; Anterior
        </button>

        <button
          v-if="visiblePages[0] > 1"
          @click="goToPage(1)"
          class="btn-pagination"
          :class="{ active: currentPage === 1 }"
          :disabled="loading"
        >
          1
        </button>
        <span v-if="visiblePages[0] > 2" class="pagination-ellipsis">...</span>

        <button
          v-for="page in visiblePages"
          :key="page"
          @click="goToPage(page)"
          class="btn-pagination"
          :class="{ active: page === currentPage, disabled: loading }"
          :disabled="loading"
        >
          {{ page }}
        </button>

        <span v-if="visiblePages[visiblePages.length - 1] < lastPage - 1" class="pagination-ellipsis">...</span>
        <button
          v-if="visiblePages[visiblePages.length - 1] < lastPage"
          @click="goToPage(lastPage)"
          class="btn-pagination"
          :class="{ active: currentPage === lastPage, disabled: loading }"
          :disabled="loading"
        >
          {{ lastPage }}
        </button>

        <button
          @click="nextPage"
          :disabled="currentPage === lastPage || loading"
          class="btn-pagination"
          :class="{ disabled: currentPage === lastPage || loading }"
        >
          Siguiente &raquo;
        </button>
      </div>
    </div>

    <div v-if="error.message && users.length > 0" class="error-inline">
      {{ error.message }}
    </div>
    </template>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ modalTitle }}</h3>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>

        <form @submit.prevent="saveUser" class="modal-body">
          <div class="form-group">
            <label>Rol *</label>
            <select v-model="form.role_id" required>
              <option value="">Seleccionar rol</option>
              <option v-for="role in roles" :key="role.id" :value="role.id">
                {{ getRoleName(role.name) }}
              </option>
            </select>
          </div>

          <div v-if="selectedRoleName" class="role-indicator" :class="selectedRoleName">
            {{ getRoleName(selectedRoleName) }}
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Nombre *</label>
              <input v-model="form.first_name" required />
            </div>
            <div v-if="showLastNameField" class="form-group">
              <label>Apellido</label>
              <input v-model="form.last_name" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Email *</label>
              <input v-model="form.email" type="email" required />
              <div v-if="emailCheck.checking || emailCheck.available !== null" class="id-check-indicator" :class="emailCheckClass">
                <span v-if="emailCheck.checking" class="id-check-icon">⏳</span>
                <span v-else-if="emailCheck.available === true" class="id-check-icon">✅</span>
                <span v-else-if="emailCheck.available === false" class="id-check-icon">❌</span>
                <span class="id-check-text">{{ emailCheckText }}</span>
                <a v-if="emailCheck.available === false && emailCheck.existingUser" :href="`/perfil/${emailCheck.existingUser.id}`" class="id-check-link">Ver perfil</a>
              </div>
            </div>
            <div class="form-group">
              <label>Contraseña {{ editingUser ? '(opcional)' : '*' }}</label>
              <input v-model="form.password" type="password" :required="!editingUser" />
            </div>
          </div>

          <div v-if="showIdentificationField" class="form-row">
            <div class="form-group">
              <label>Cédula</label>
              <input v-model="form.identification_number" />
              <div v-if="idCheck.checking || idCheck.available !== null" class="id-check-indicator" :class="idCheckClass">
                <span v-if="idCheck.checking" class="id-check-icon">⏳</span>
                <span v-else-if="idCheck.available === true" class="id-check-icon">✅</span>
                <span v-else-if="idCheck.available === false" class="id-check-icon">❌</span>
                <span class="id-check-text">{{ idCheckText }}</span>
                <a v-if="idCheck.available === false && idCheck.existingUser" :href="`/perfil/${idCheck.existingUser.id}`" class="id-check-link">Ver perfil</a>
              </div>
            </div>
            <div v-if="showPhoneField" class="form-group">
              <label>Teléfono</label>
              <input v-model="form.phone" />
            </div>
          </div>

          <div v-if="showSectionField" class="form-group">
            <label>Sección</label>
            <select v-model="form.section_id">
              <option value="">Sin asignar</option>
              <option v-for="section in sections" :key="section.id" :value="section.id">
                {{ section.grade?.name }} — {{ section.name }} ({{ section.schoolYear?.name || '' }})
              </option>
            </select>
            <small v-if="showSectionWarning" class="form-warning">
              ⚠️ Este estudiante no tiene sección asignada. Podrá asignarla después.
            </small>
          </div>

          <div class="form-group" v-if="editingUser">
            <label class="checkbox-label">
              <input v-model="form.activo" type="checkbox" />
              Usuario activo
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" @click="closeModal" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de operaciones masivas -->
    <div v-if="showBatchModal" class="modal-overlay" @click.self="closeBatchModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ batchAction === 'assign_section' ? 'Asignar sección' : 'Desactivar usuarios' }}</h3>
          <button @click="closeBatchModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="batchResult" class="batch-result">
            <p class="result-success">✅ {{ batchResult.success }} usuario(s) actualizado(s)</p>
            <div v-if="batchResult.errors.length > 0" class="result-errors">
              <p>⚠️ {{ batchResult.errors.length }} error(es):</p>
              <ul>
                <li v-for="(err, i) in batchResult.errors" :key="i">
                  <strong>{{ err.user_name }}</strong>: {{ err.reason }}
                </li>
              </ul>
            </div>
          </div>

          <template v-else>
            <div v-if="batchPreview" class="batch-preview">
              <p class="preview-summary">
                Se actualizarán <strong>{{ batchPreview.will_update }} usuario(s)</strong> correctamente.
              </p>
              <p v-if="batchPreview.will_fail > 0" class="preview-warnings">
                ⚠️ {{ batchPreview.will_fail }} usuario(s) tendrán conflictos:
              </p>
              <ul v-if="batchPreview.will_fail > 0" class="preview-errors">
                <li v-for="(detail, i) in batchPreview.details.filter(d => d.status !== 'ok')" :key="i">
                  <strong>{{ detail.user_name || 'ID ' + detail.user_id }}</strong>: {{ detail.reason }}
                </li>
              </ul>
            </div>

            <p v-else>¿Deseas aplicar esta acción a <strong>{{ selectedUsers.size }} usuario(s)</strong>?</p>

            <div v-if="batchAction === 'deactivate'" class="batch-warning">
              ⚠️ Esta acción desactivará el acceso al sistema de los usuarios seleccionados.
            </div>

            <div v-if="batchAction === 'assign_section'" class="form-group">
              <label>Sección destino *</label>
              <select v-model="batchSectionId" required>
                <option value="">Seleccionar sección</option>
                <option v-for="section in sections" :key="section.id" :value="section.id">
                  {{ section.grade?.name }} - {{ section.name }}
                </option>
              </select>
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <button v-if="batchResult" @click="closeBatchModal" class="btn-primary">Cerrar</button>
          <template v-else>
            <button @click="closeBatchModal" class="btn-cancel" :disabled="isProcessing">Cancelar</button>
            <button @click="executeBatch" class="btn-primary" :disabled="isProcessing || (batchAction === 'assign_section' && !batchSectionId)">
              {{ isProcessing ? 'Procesando...' : 'Confirmar' }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ─── Loading ─────────────────────────────────────────────── */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 0;
  font-size: 15px;
  color: #6b7280;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #e5e7eb;
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ─── Errores ─────────────────────────────────────────────── */
.error-message {
  text-align: center;
  padding: 32px 16px;
  border: 1px solid;
  border-radius: 8px;
  margin: 16px 0;
}

.error-message[data-type="empty"] {
  color: #6b7280;
  background: #f9fafb;
  border-color: #e5e7eb;
}

.error-message[data-type="auth"] {
  color: #b45309;
  background: #fffbeb;
  border-color: #fde68a;
}

.error-message[data-type="network"] {
  color: #dc2626;
  background: #fef2f2;
  border-color: #fecaca;
}

.error-message[data-type="server"],
.error-message[data-type="unknown"] {
  color: #dc2626;
  background: #fef2f2;
  border-color: #fecaca;
}

.error-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.error-message p {
  margin: 0 0 12px;
  font-size: 15px;
}

.error-inline {
  text-align: center;
  padding: 8px 16px;
  color: #dc2626;
  font-size: 14px;
}

.btn-retry {
  display: inline-block;
  margin-top: 12px;
  padding: 8px 20px;
  background: #7c3aed;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.15s ease;
}

.btn-retry:hover {
  background: #6d28d9;
}

/* ─── Paginación ──────────────────────────────────────────── */
.pagination-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  padding: 16px 0;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-pagination {
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-pagination:hover:not(.disabled):not(.active) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.btn-pagination.active {
  background: #7c3aed;
  color: white;
  border-color: #7c3aed;
}

.btn-pagination.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-ellipsis {
  padding: 0 4px;
  color: #9ca3af;
  font-size: 14px;
}

/* ─── Filtro desde dashboard ─────────────────────────────── */
.filter-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  margin-top: 12px;
  font-size: 14px;
  color: #1e40af;
}

.banner-icon { font-size: 18px; }
.banner-text { flex: 1; font-weight: 500; }

.banner-clear {
  padding: 4px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s ease;
}

.banner-clear:hover { background: #2563eb; }

.filter-banner.eligible {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #166534;
}

.filter-banner.eligible .banner-clear {
  background: #22c55e;
}

.filter-banner.eligible .banner-clear:hover {
  background: #16a34a;
}

.filter-banner.role {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #166534;
}

.filter-banner.role .banner-clear {
  background: #22c55e;
}

.filter-banner.role .banner-clear:hover {
  background: #16a34a;
}
.role-indicator {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-indicator.estudiante {
  background: #dbeafe;
  color: #1e40af;
}

.role-indicator.profesor {
  background: #dcfce7;
  color: #166534;
}

.role-indicator.admin {
  background: #fef3c7;
  color: #92400e;
}

.form-warning {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #b45309;
  background: #fffbeb;
  padding: 4px 8px;
  border-radius: 4px;
  border-left: 3px solid #f59e0b;
}

/* ─── Validación de cédula en tiempo real ─────────────────── */
.id-check-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.id-check-indicator.checking {
  background: #f3f4f6;
  color: #6b7280;
}

.id-check-indicator.available {
  background: #f0fdf4;
  color: #166534;
}

.id-check-indicator.taken {
  background: #fef2f2;
  color: #dc2626;
}

.id-check-icon {
  font-size: 14px;
}

.id-check-text {
  line-height: 1.4;
}

.id-check-link {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  color: #7c3aed;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s ease;
}

.id-check-link:hover {
  color: #6d28d9;
  text-decoration: underline;
}

/* ─── Barra de acciones masivas ───────────────────────────── */
.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  margin-bottom: 12px;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.batch-count {
  font-weight: 600;
  color: #1e40af;
  font-size: 14px;
}

.btn-batch {
  padding: 6px 14px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s ease;
}

.btn-batch:hover { background: #2563eb; }
.btn-batch:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-batch-danger {
  background: #ef4444;
}

.btn-batch-danger:hover { background: #dc2626; }

.btn-batch-clear {
  margin-left: auto;
  padding: 6px 14px;
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.btn-batch-clear:hover { background: #f3f4f6; }

/* ─── Fila seleccionada ───────────────────────────────────── */
.row-selected {
  background: #eff6ff;
}

.col-checkbox {
  width: 40px;
  text-align: center;
}

.col-checkbox input[type="checkbox"] {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

/* ─── Modal batch resultado ───────────────────────────────── */
.batch-result { padding: 8px 0; }
.result-success { color: #166534; font-weight: 600; margin-bottom: 8px; }
.result-errors { color: #92400e; }
.result-errors ul { margin: 4px 0 0 20px; font-size: 13px; }
.result-errors li { margin-bottom: 2px; }
.batch-warning { background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; color: #92400e; font-size: 14px; margin-top: 8px; }

/* ─── Preview de operación masiva (F12-H8) ────────────────── */
.batch-preview { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }
.preview-summary { color: #166534; font-size: 14px; margin: 0 0 4px; }
.preview-warnings { color: #92400e; font-size: 13px; margin: 4px 0 2px; }
.preview-errors { margin: 4px 0 0 16px; font-size: 12px; color: #b45309; }
.preview-errors li { margin-bottom: 2px; }
</style>
