<script setup>
import { useRoute } from 'vue-router';
import Navbar from './components/Navbar.vue';
import { computed } from 'vue';

const route = useRoute();

const showNavbar = computed(() => {
  return route.path !== '/login';
});
</script>

<template>
  <Navbar v-if="showNavbar" />
  <router-view />
</template>
