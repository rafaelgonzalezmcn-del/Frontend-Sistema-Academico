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

router.beforeEach(async (to, from, next) => {
  const { isAuthenticated, user, fetchUser, token } = useAuth();
  
  // Verificar si hay token en localStorage
  const hasToken = !!localStorage.getItem('token');
  
  // Si el usuario no está cargado pero hay token, cargarlo
  if (!user.value && hasToken) {
    await fetchUser();
  }
  
  // Redirigir a login si no está autenticado
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next('/login');
  }
  // Redirigir a dashboard apropiado según el rol
  else if (to.path === '/login' && isAuthenticated.value) {
    if (user.value?.role?.name === 'admin') {
      next('/admin');
    } else if (user.value?.role?.name === 'profesor') {
      next('/profesor');
    } else if (user.value?.role?.name === 'estudiante') {
      next('/estudiante');
    } else {
      next('/');
    }
  }
  // Verificar permisos de admin
  else if (to.meta.requiresAdmin && user.value?.role?.name !== 'admin') {
    next('/admin');
  }
  // Verificar permisos de profesor
  else if (to.meta.requiresTeacher && user.value?.role?.name !== 'profesor') {
    if (user.value?.role?.name === 'admin') {
      next('/admin');
    }
    next('/');
  }
  // Verificar permisos de estudiante
  else if (to.meta.requiresStudent && user.value?.role?.name !== 'estudiante') {
    if (user.value?.role?.name === 'admin') {
      next('/admin');
    } else if (user.value?.role?.name === 'profesor') {
      next('/profesor');
    }
    next('/');
  } else {
    next();
  }
});

export default router;
