import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import Login from '../views/Login.vue';
import AdminDashboard from '../views/AdminDashboard.vue';
import TeacherDashboard from '../views/teacher/TeacherDashboard.vue';
import MateriaProfesor from '../views/teacher/MateriaProfesor.vue';
import VerEntregasTarea from '../views/teacher/VerEntregasTarea.vue';
import DashboardEstudiante from '../views/student/DashboardEstudiante.vue';
import MateriaEstudiante from '../views/student/MateriaEstudiante.vue';
import Profile from '../views/Profile.vue';
import Users from '../views/admin/Users.vue';
import SchoolYears from '../views/admin/SchoolYears.vue';
import Grades from '../views/admin/Grades.vue';
import Sections from '../views/admin/Sections.vue';
import Subjects from '../views/admin/Subjects.vue';
import Schedules from '../views/admin/Schedules.vue';
import EnrollmentWizard from '../views/admin/EnrollmentWizard.vue';
import ActivityLog from '../views/admin/ActivityLog.vue';
import AcademicHistory from '../views/admin/AcademicHistory.vue';
import Promotions from '../views/admin/Promotions.vue';
import CourseClosures from '../views/admin/CourseClosures.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Home',
    component: AdminDashboard, // Temporalmente usa el mismo dashboard
    meta: { requiresAuth: true }
  },
  {
    path: '/profesor',
    name: 'TeacherDashboard',
    component: TeacherDashboard,
    meta: { requiresAuth: true, requiresTeacher: true }
  },
  {
    path: '/profesor/materia/:id',
    name: 'MateriaProfesor',
    component: MateriaProfesor,
    meta: { requiresAuth: true, requiresTeacher: true }
  },
  {
    path: '/profesor/materia/:materiaId/tarea/:tareaId',
    name: 'VerEntregasTarea',
    component: VerEntregasTarea,
    meta: { requiresAuth: true, requiresTeacher: true }
  },
  {
    path: '/estudiante',
    name: 'DashboardEstudiante',
    component: DashboardEstudiante,
    meta: { requiresAuth: true, requiresStudent: true }
  },
  {
    path: '/estudiante/materia/:id',
    name: 'MateriaEstudiante',
    component: MateriaEstudiante,
    meta: { requiresAuth: true, requiresStudent: true }
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/perfil',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true }
  },
  {
    path: '/perfil/:id',
    name: 'UserProfile',
    component: Profile,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/usuarios',
    name: 'Users',
    component: Users,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/anos-lectivos',
    name: 'SchoolYears',
    component: SchoolYears,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/grados',
    name: 'Grades',
    component: Grades,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/secciones',
    name: 'Sections',
    component: Sections,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/materias',
    name: 'Subjects',
    component: Subjects,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/horarios',
    name: 'Schedules',
    component: Schedules,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/matricula',
    name: 'EnrollmentWizard',
    component: EnrollmentWizard,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/actividad',
    name: 'ActivityLog',
    component: ActivityLog,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/students/:id/history',
    name: 'AcademicHistory',
    component: AcademicHistory,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/promociones',
    name: 'Promotions',
    component: Promotions,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/cierre-cursos',
    name: 'CourseClosures',
    component: CourseClosures,
    meta: { requiresAuth: true, requiresAdmin: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Página de inicio según el rol del usuario
const inicioPorRol = (rol) => {
  if (rol === 'admin') return '/admin';
  if (rol === 'profesor') return '/profesor';
  if (rol === 'estudiante') return '/estudiante';
  return '/';
};

// Se usa el estilo "return" de Vue Router 4 (en vez de next()):
// cada caso devuelve una sola vez, así no hay llamadas dobles ni redirecciones en bucle.
router.beforeEach(async (to) => {
  const { isAuthenticated, user, fetchUser } = useAuth();

  // Si hay token pero el usuario no está cargado, cargarlo
  if (!user.value && localStorage.getItem('token')) {
    await fetchUser();
  }

  const rol = user.value?.role?.name;

  // Rutas protegidas sin sesión → login
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return '/login';
  }

  // Ya autenticado intentando ir al login → su panel
  if (to.path === '/login' && isAuthenticated.value) {
    return inicioPorRol(rol);
  }

  // Ruta de un rol distinto al del usuario → su propio panel
  // (antes: un no-admin en ruta de admin era enviado a /admin otra vez → bucle infinito)
  const rolRequerido =
    (to.meta.requiresAdmin && 'admin') ||
    (to.meta.requiresTeacher && 'profesor') ||
    (to.meta.requiresStudent && 'estudiante') ||
    null;

  if (rolRequerido && rol !== rolRequerido) {
    const destino = inicioPorRol(rol);
    // Evita redirigir a la misma ruta en la que ya estamos
    return destino === to.path ? '/login' : destino;
  }

  return true;
});

export default router;
