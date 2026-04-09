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
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar-brand {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  text-decoration: none;
}

.navbar-brand:hover {
  color: #42b883;
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.role-badge {
  background: #42b883;
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  text-transform: capitalize;
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
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.dropdown-toggle:hover {
  background: #f0f0f0;
}

.dots {
  font-size: 18px;
  color: #666;
  font-weight: bold;
  display: block;
  line-height: 1;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  z-index: 1001;
  margin-top: 8px;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  color: #333;
  text-decoration: none;
  font-size: 14px;
  border: none;
  background: none;
  width: 100%;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f5f5f5;
}

.dropdown-item.logout {
  color: #e74c3c;
  border-top: 1px solid #eee;
}

.dropdown-item.logout:hover {
  background: #fee;
}

.icon {
  font-size: 16px;
}
</style>
