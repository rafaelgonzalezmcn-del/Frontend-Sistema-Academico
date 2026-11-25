<script setup>
import { useRoute } from 'vue-router';
import Navbar from './components/Navbar.vue';
import AdminSidebar from './components/AdminSidebar.vue';
import { computed } from 'vue';
import { useAuth } from './composables/useAuth';
import { useSidebar } from './composables/useSidebar';

const route = useRoute();
const { user } = useAuth();
const { contraido } = useSidebar();

const showNavbar = computed(() => {
  return route.path !== '/login';
});

// El menú lateral se muestra en las pantallas de administración
const conMenuAdmin = computed(() =>
  showNavbar.value
  && user.value?.role?.name === 'admin'
  && route.path.startsWith('/admin')
);

// El aula de un curso (profesor) dibuja su propio menú lateral con el índice
const conMenuCurso = computed(() =>
  showNavbar.value && ['CursoProfesor', 'MateriaProfesor'].includes(route.name)
);

// Cualquier pantalla con menú lateral: deja espacio a la izquierda y muestra ☰ en celular
const conMenuLateral = computed(() => conMenuAdmin.value || conMenuCurso.value);
</script>

<template>
  <Navbar v-if="showNavbar" :con-menu="conMenuLateral" />
  <AdminSidebar v-if="conMenuAdmin" />
  <main :class="{ 'con-barra': showNavbar, 'contenido-con-menu': conMenuLateral, 'menu-contraido': conMenuLateral && contraido }">
    <router-view />
  </main>
</template>

<style>
:root {
  /* Alto fijo de la barra superior: el menú lateral empieza justo debajo */
  --navbar-alto: 62px;
}

/* Sin el "rebote" elástico del navegador al llegar arriba o abajo de la página
   (estiraba el contenido y lo separaba de la barra y el menú fijos) */
html,
body {
  overscroll-behavior-y: none;
}

/* La barra superior es fija: el contenido empieza debajo de ella */
.con-barra {
  padding-top: var(--navbar-alto);
}

.contenido-con-menu {
  margin-left: 248px; /* ancho del menú lateral */
  min-width: 0;
  transition: margin-left 0.2s ease;
}

.contenido-con-menu.menu-contraido {
  margin-left: 72px; /* menú contraído: solo íconos */
}

@media (max-width: 900px) {
  .contenido-con-menu,
  .contenido-con-menu.menu-contraido {
    margin-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .contenido-con-menu {
    transition: none;
  }
}
</style>
