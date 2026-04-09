<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  show: Boolean,
  title: String,
  items: {
    type: Array,
    default: () => []
  },
  itemLabel: {
    type: String,
    default: 'name'
  },
  itemValue: {
    type: String,
    default: 'id'
  },
  searchPlaceholder: {
    type: String,
    default: 'Buscar...'
  },
  searchFields: {
    type: Array,
    default: () => ['name']
    // Ejemplo: ['display_name', 'grade_name'] para buscar en múltiples campos
  },
  loading: Boolean
});

const emit = defineEmits(['close', 'select']);

const searchQuery = ref('');

const filteredItems = ref([]);

watch(() => props.items, (newItems) => {
  filteredItems.value = newItems;
}, { immediate: true });

watch(searchQuery, (query) => {
  if (!query) {
    filteredItems.value = props.items;
  } else {
    const q = query.toLowerCase();
    filteredItems.value = props.items.filter(item => {
      // Si searchFields está definido, buscar en todos los campos especificados
      if (props.searchFields && props.searchFields.length > 0) {
        return props.searchFields.some(field => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(q);
        });
      }
      // Comportamiento por defecto: buscar en itemLabel
      return item[props.itemLabel]?.toLowerCase().includes(q);
    });
  }
});

const selectItem = (item) => {
  emit('select', item);
};
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-container">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" @click="emit('close')">&times;</button>
        </div>
        
        <div class="modal-body">
          <input 
            v-model="searchQuery"
            type="text" 
            :placeholder="searchPlaceholder"
            class="search-input"
          />
          
          <div v-if="loading" class="loading">
            Cargando...
          </div>
          
          <div v-else-if="filteredItems.length === 0" class="no-results">
            No se encontraron resultados
          </div>
          
          <ul v-else class="items-list">
            <li 
              v-for="item in filteredItems" 
              :key="item[itemValue]"
              @click="selectItem(item)"
              class="item"
            >
              <span class="item-label">{{ item.display_name || item[itemLabel] }}</span>
              <span v-if="item.email" class="item-email">{{ item.email }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #42b883;
}

.loading, .no-results {
  text-align: center;
  padding: 20px;
  color: #666;
}

.items-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.item {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item:hover {
  background: #f8f9fa;
}

.item:last-child {
  border-bottom: none;
}

.item-label {
  font-weight: 500;
  color: #333;
}

.item-email {
  color: #666;
  font-size: 13px;
}
</style>
