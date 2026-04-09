<script setup>
defineProps({
  show: Boolean,
  pdfUrl: String,
  title: String
});

const emit = defineEmits(['update:show', 'close']);

const close = () => {
  emit('update:show', false);
  emit('close');
};
</script>

<template>
  <div v-if="show" class="pdf-viewer-overlay" @click.self="close">
    <div class="pdf-viewer-modal">
      <div class="pdf-viewer-header">
        <h3>{{ title }}</h3>
        <button class="pdf-viewer-close" @click="close">✕</button>
      </div>
      <div class="pdf-viewer-content">
        <iframe :src="pdfUrl" title="Visor PDF"></iframe>
      </div>
    </div>
  </div>
</template>
