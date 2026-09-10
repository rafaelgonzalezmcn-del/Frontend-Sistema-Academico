<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const route = useRoute();
const { user, logout } = useAuth();

const showMenu = ref(false);

// Determinar el texto del navbar según el rol
const navbarTitle = computed(() => {
  const roleName = user.value?.role?.name;
  
  if (roleName === 'admin') {
    return 'Sistema Académico - Panel de Administración';
  } else if (roleName === 'profesor') {
    return 'Sistema Académico - Panel de Profesor';
  } else {
    return 'Sistema Académico';
  }
});

// Determinar la ruta del logo según el rol
const homePath = computed(() => {
  const roleName = user.value?.role?.name;
  
  if (roleName === 'admin') {
    return '/admin';
  } else if (roleName === 'profesor') {
    return '/profesor';
  }
  return '/';
});

// Ruta del perfil según el rol
const profilePath = computed(() => {
  return '/perfil';
});

// Color del badge según el rol
const roleBadgeClass = computed(() => {
  const roleName = user.value?.role?.name;
  
  if (roleName === 'admin') {
    return 'role-admin';
  } else if (roleName === 'profesor') {
    return 'role-profesor';
  }
  return 'role-default';
});

const handleLogout = async () => {
  try {
    await logout();
  } finally {
    router.push('/login');
  }
};

const goToProfile = () => {
  showMenu.value = false;
  router.push('/perfil');
};

const toggleMenu = () => {
  showMenu.value = !showMenu.value;
};

const closeMenu = () => {
  showMenu.value = false;
};
</script>

<template>
  <nav class="navbar">
    <router-link :to="homePath" class="navbar-brand">
      {{ navbarTitle }}
    </router-link>
    
    <div class="navbar-user" v-if="user">
      <span>{{ user?.first_name }} {{ user?.last_name }}</span>
      <span class="role-badge" :class="roleBadgeClass">
        {{ user?.role?.name === 'profesor' ? 'Profesor' : user?.role?.name }}
      </span>
      
      <!-- Menú desplegable con tres puntitos -->
      <div class="dropdown-container">
        <button class="dropdown-toggle" @click="toggleMenu">
          <span class="dots">⋮</span>
        </button>
        
        <div v-if="showMenu" class="dropdown-menu">
          <router-link :to="profilePath" class="dropdown-item" @click="closeMenu">
            <span class="icon">👤</span> Perfil
          </router-link>
          <button class="dropdown-item logout" @click="handleLogout">
            <span class="icon">🚪</span> Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  background: white;
  padding: 14px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-bottom: 2px solid #1f2937;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar-brand {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 10px;
}

.navbar-brand:hover {
  color: #374151;
}

.navbar-brand::before {
  content: '🎓';
  font-size: 22px;
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  color: #1f2937;
}

.navbar-user > span:first-of-type {
  font-weight: 500;
  font-size: 14px;
}

.role-badge {
  background: #1f2937;
  color: white;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.role-badge.role-admin {
  background: #7c3aed;
}

.role-badge.role-profesor {
  background: #0891b2;
}

.role-badge.role-default {
  background: #6b7280;
}

/* Dropdown Styles */
.dropdown-container {
  position: relative;
}

.dropdown-toggle {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  transition: background 0.2s;
}

.dropdown-toggle:hover {
  background: #e5e7eb;
}

.dots {
  font-size: 20px;
  color: #1f2937;
  font-weight: bold;
  display: block;
  line-height: 1;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: none;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  z-index: 1001;
  margin-top: 8px;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  color: #374151;
  text-decoration: none;
  font-size: 14px;
  border: none;
  background: none;
  width: 100%;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f3f4f6;
}

.dropdown-item.logout {
  color: #dc2626;
  border-top: 1px solid #f3f4f6;
}

.dropdown-item.logout:hover {
  background: #fef2f2;
}

.icon {
  font-size: 16px;
}
</style>
