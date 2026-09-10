<template>
  <div 
    class="loading-spinner" 
    :class="[sizeClass]"
    role="status"
    :aria-label="message || 'Cargando...'"
  >
    <span class="spinner-circle"></span>
    <span v-if="message" class="spinner-message">{{ message }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  message: {
    type: String,
    default: ''
  }
});

const sizeClass = computed(() => `size-${props.size}`);
</script>

<style scoped>
.loading-spinner {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #6b7280;
  font-size: 14px;
}

.spinner-circle {
  border-radius: 50%;
  border-style: solid;
  border-color: #e5e7eb;
  animation: spin 0.7s linear infinite;
}

/* Sizes */
.size-small .spinner-circle {
  width: 14px;
  height: 14px;
  border-width: 2px;
  border-top-color: #7c3aed;
}

.size-medium .spinner-circle {
  width: 20px;
  height: 20px;
  border-width: 3px;
  border-top-color: #7c3aed;
}

.size-large .spinner-circle {
  width: 32px;
  height: 32px;
  border-width: 4px;
  border-top-color: #7c3aed;
}

.spinner-message {
  font-weight: 500;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>