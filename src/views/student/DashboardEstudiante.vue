<template>
  <div class="estudiante-dashboard">
    <!-- Header de Bienvenida -->
    <div class="welcome-section">
      <h1>Bienvenido, {{ userName }}</h1>
      <p class="school-year" v-if="schoolYear">Año lectivo: {{ schoolYear }}</p>
      <p class="school-year" v-if="sectionName">Paralelo: {{ sectionName }}</p>
    </div>

    <!-- Mensaje de Error -->
    <div v-if="error" class="error-message">
      {{ error }}
      <button class="close-error" @click="error = ''">&times;</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      Cargando información...
    </div>

    <template v-else>
      <!-- Sección de Materias -->
      <section class="subjects-section">
        <h2 class="section-title">Mis Materias</h2>
        
        <div v-if="materias && materias.length > 0" class="subjects-grid">
          <div 
            v-for="materia in materias" 
            :key="materia.id" 
            class="subject-card clickable"
            @click="irAMateria(materia)"
          >
            <span class="subject-icon">📚</span>
            <div class="subject-info">
              <h3 class="subject-name">{{ materia.name }}</h3>
              <div class="subject-sections">
                <span class="section-tag" v-if="materia.section">
                  {{ materia.section.grade }} - {{ materia.section.name }}
                </span>
              </div>
              <p class="subject-teacher" v-if="materia.teacher">
                Profesor: {{ materia.teacher.name }}
              </p>
            </div>
            <span class="card-arrow">→</span>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>No tienes materias asignadas actualmente.</p>
        </div>
      </section>

      <!-- Sección de Horario -->
      <section class="schedule-section">
        <h2 class="section-title">Mi Horario</h2>
        
        <div v-if="schedule && schedule.length > 0" class="schedule-grid-wrapper">
          <div class="schedule-grid">
            <!-- Encabezados -->
            <div class="grid-header">
              <div class="time-header">Hora</div>
              <div 
                v-for="day in days" 
                :key="day" 
                class="day-header"
              >
                {{ day }}
              </div>
            </div>
            
            <!-- Cuerpo del horario -->
            <div class="grid-body">
              <div 
                v-for="hour in hours" 
                :key="hour" 
                class="grid-row"
              >
                <div class="time-cell">{{ hour.toString().padStart(2, '0') }}:00</div>
                <div 
                  v-for="day in days" 
                  :key="day" 
                  class="schedule-cell"
                >
                  <template v-if="getScheduleForCell(day, hour)">
                    <div class="schedule-content">
                      <div class="subject-name">
                        {{ getScheduleForCell(day, hour).subject?.name }}
                      </div>
                      <div class="section-name">
                        {{ getScheduleForCell(day, hour).section?.name }}
                      </div>
                      <div class="time-range">
                        {{ getScheduleForCell(day, hour).start_time }} - 
                        {{ getScheduleForCell(day, hour).end_time }}
                      </div>
                    </div>
                  </template>
                  <div v-else class="empty-cell"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>No tienes clases programadas.</p>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../../composables/useAuth';
import { apiNormalized } from '../../services/apiNormalized';

const router = useRouter();
const { user } = useAuth();

const loading = ref(true);
const error = ref('');
const materias = ref([]);
const schedule = ref([]); // Array de clases
const schoolYear = ref('');
const sectionName = ref('');

// Días de la semana
const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const userName = computed(() => {
  if (user.value) {
    return `${user.value.first_name} ${user.value.last_name}`;
  }
  return 'Estudiante';
});

// Obtener todas las horas que cubren las clases (desde inicio hasta fin)
const hours = computed(() => {
  if (!schedule.value || schedule.value.length === 0) {
    return [];
  }
  
  let minHour = 23;
  let maxHour = 0;
  
  schedule.value.forEach(item => {
    if (item.start_time && item.end_time && 
        typeof item.start_time === 'string' && 
        typeof item.end_time === 'string') {
      
      const startHour = parseInt(item.start_time.split(':')[0], 10);
      const endHour = parseInt(item.end_time.split(':')[0], 10);
      
      if (!isNaN(startHour) && startHour < minHour) {
        minHour = startHour;
      }
      if (!isNaN(endHour) && endHour > maxHour) {
        maxHour = endHour;
      }
    }
  });
  
  // Generar array de horas desde la primera hasta la última
  const result = [];
  for (let h = minHour; h <= maxHour; h++) {
    if (h >= 5 && h <= 22) {
      result.push(h);
    }
  }
  
  return result;
});

// Obtener clase para una celda específica
const getScheduleForCell = (day, hour) => {
  const result = schedule.value.find(item => {
    if (item.day !== day) return false;
    if (!item.start_time || !item.end_time) return false;
    const startHour = parseInt(item.start_time.split(':')[0], 10);
    const endHour = parseInt(item.end_time.split(':')[0], 10);
    if (isNaN(startHour) || isNaN(endHour)) return false;
    return hour >= startHour && hour < endHour;
  });
  return result;
};

const fetchMaterias = async () => {
  try {
    // El servicio ahora devuelve respuesta normalizada
    const response = await apiNormalized.get('/my-subjects-student');
    if (response.data) {
      materias.value = response.data;
      // Los metadatos vienen en response.meta
      schoolYear.value = response.meta?.school_year || '';
      sectionName.value = response.meta?.section || '';
    }
  } catch (err) {
    error.value = 'Error al cargar las materias';
  }
};

const fetchSchedule = async () => {
  try {
    // El servicio ahora devuelve respuesta normalizada
    const response = await apiNormalized.get('/my-schedule');
    
    if (response.data) {
      // El backend retorna { Lunes: [], Martes: [], ... }
      // Convertir a array plano
      const data = response.data;
      let scheduleArray = [];
      
      Object.keys(data).forEach(dia => {
        if (data[dia] && Array.isArray(data[dia])) {
          data[dia].forEach(clase => {
            // Extraer solo la hora del formato ISO
            const startTime = clase.start_time ? clase.start_time.split('T')[1]?.substring(0, 5) : '';
            const endTime = clase.end_time ? clase.end_time.split('T')[1]?.substring(0, 5) : '';
            
            scheduleArray.push({
              day: dia, // Mantener el día como viene del backend
              start_time: startTime,
              end_time: endTime,
              subject: { name: clase.subject },
              section: { name: '' }
            });
          });
        }
      });
      
      schedule.value = scheduleArray;
    }
  } catch (err) {
    // No mostrar error, simplemente no hay horario
  }
};

const irAMateria = (materia) => {
  router.push({
    name: 'MateriaEstudiante',
    params: { id: materia.id }
  });
};

onMounted(async () => {
  try {
    await Promise.all([
      fetchMaterias(),
      fetchSchedule()
    ]);
  } catch (err) {
    error.value = 'Error al cargar los datos';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* Component-specific styles are in global.css */
</style>
