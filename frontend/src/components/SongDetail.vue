<template>
  <div class="song-detail">
    <q-avatar size="52px" class="song-avatar">
      <div class="cover-container">
        <img 
          :src="song.coverUrl || defaultCover" 
          class="cover-img"
          :class="{ 'loaded': imageLoaded }"
          @load="onImageLoad"
        />
      </div>
    </q-avatar>
    <div class="song-info">
      <div class="song-title">{{ song.title }}</div>
      <div v-if="translation" class="song-translation">{{ translation }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { usePlayerStore } from '@/stores/playerStore'
import { getLanguage } from '@/i18n'
import { getGlobalTranslations } from '@/services/translateService'

const props = defineProps({
  song: {
    type: Object,
    required: true
  }
})

const playerStore = usePlayerStore()
const defaultCover = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjVGNUY1Ii8+PHBhdGggZmlsbD0iI0ZGQjZDNSIgZD0iTTEyIDN2MTAuNTVjLS41OS0uMzQtMS4yNy0uNTUtMi0uNTVjLTIuMjEgMC00IDEuNzktNCA0czEuNzkgNCA0IDRzNC0xLjc5IDQtNFY3aDRWMy0xMnYtMTNoLTR6Ii8+PC9zdmc+'

const imageLoaded = ref(false)
const globalTranslations = getGlobalTranslations()

const translation = computed(() => {
  return globalTranslations.value[props.song.id] || null
})

const onImageLoad = () => {
  imageLoaded.value = true
}

watch(() => props.song, () => {
  imageLoaded.value = false
}, { deep: true })

watch(() => getLanguage(), () => {
})
</script>

<style scoped>
.song-detail {
  display: flex;
  align-items: center;
  gap: 12px;
}

.song-avatar {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(255, 182, 193, 0.2);
  border: 2px solid #FFE4E9;
}

.cover-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(8px);
  transition: filter 0.3s ease;
}

.cover-img.loaded {
  filter: blur(0);
}

.song-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.song-title {
  font-size: 14px;
  font-weight: 600;
  color: #212121;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-translation {
  font-size: 11px;
  color: #9E9E9E;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 288px) {
  .song-avatar {
    display: none;
  }
  
  .song-detail {
    gap: 0;
  }
}
</style>
