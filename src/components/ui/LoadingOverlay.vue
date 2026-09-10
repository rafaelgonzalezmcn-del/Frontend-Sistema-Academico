<template>
  <Teleport to="body">
    <Transition name="overlay-fade">
      <div v-if="show" class="loading-overlay" :class="{ 'with-message': message }">
        <div class="overlay-content">
          <LoadingSpinner :size="size" :message="message" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import LoadingSpinner from './LoadingSpinner.vue';

defineProps({
  show: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'large',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  }
});
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.loading-overlay.with-message {
  background-color: rgba(255, 255, 255, 0.95);
}

.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* Transition */
.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}
</style>