<template>
  <q-page class="music-list-page">
    <div class="music-list-container">
      <q-banner v-if="showDemoMode" inline-actions class="demo-banner">
        <template v-slot:avatar>
          <q-icon name="info" color="primary" />
        </template>
        {{ $t('musicList.demoBanner') }}
        <template v-slot:action>
          <q-btn flat :label="$t('common.refresh')" color="primary" @click="loadMusicList" />
        </template>
      </q-banner>

      <div class="controls-bar">
        <div class="search-wrapper">
          <q-input
            v-model="searchQuery"
            :placeholder="$t('common.searchPlaceholder')"
            class="search-input"
            dense
            borderless
          >
            <template v-slot:prepend>
              <q-icon name="search" color="#BDBDBD" />
            </template>
            <template v-slot:append>
              <q-icon
                v-if="searchQuery"
                name="close"
                color="#FFB6C1"
                class="close-icon cursor-pointer"
                @click="clearSearch"
              />
            </template>
          </q-input>
        </div>

        <div class="sort-controls">
          <q-select
            v-model="sortOption"
            :options="sortOptions"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            borderless
            dense
            class="sort-select"
          >
            <template v-slot:prepend>
              <q-icon name="sort" />
            </template>
          </q-select>
        </div>
      </div>

      <div v-if="filteredMusicList.length > 0" class="music-grid">
        <div
          v-for="song in filteredMusicList"
          :key="song.id"
          class="music-card"
          :class="{ 'music-card--active': activeSongId === song.id }"
          @click="playSong(song, getOriginalIndex(song))"
          @touchstart="onCardTouchStart(song.id)"
          @touchend="onCardTouchEnd"
          @touchcancel="onCardTouchEnd"
        >
          <div class="card-cover">
            <img 
              :src="song.coverUrl || defaultCover" 
              :alt="song.title" 
              class="cover-image"
              :class="{ 'loaded': loadedImages[song.id] }"
              loading="lazy"
              @load="onImageLoad(song.id)"
              @error="onImageError(song.id)"
            />
            <div class="play-overlay" :class="{ 'play-overlay--visible': activeSongId === song.id }">
              <q-icon name="play_circle" size="48px" color="white" />
            </div>
          </div>
          <div class="card-info">
            <div class="song-title">{{ song.title }}</div>
            <div class="song-meta">
              <span class="song-duration">{{ formatDuration(song.duration) }}</span>
              <span v-if="translatedTitles[song.id]" class="song-separator"> - </span>
              <span v-if="translatedTitles[song.id]" class="song-translation">{{ translatedTitles[song.id] }}</span>
            </div>
            <div class="song-updated">{{ $t('musicList.updated') }}: {{ formatDate(song.lastModified) }}</div>
          </div>
        </div>
      </div>

      <div v-else-if="!loading && searchQuery" class="empty-state">
        <q-icon name="search_off" size="80px" color="#FFD1DC" />
        <div class="empty-text">{{ $t('common.noSearchResults') }}</div>
        <div class="empty-subtext">{{ $t('common.tryOtherKeywords') }}</div>
      </div>

      <div v-else-if="!loading" class="empty-state">
        <q-icon name="music_note" size="80px" color="#FFD1DC" />
        <div class="empty-text">{{ $t('musicList.emptyText') }}</div>
        <div class="empty-subtext">{{ $t('musicList.emptySubtext') }}</div>
      </div>

      <q-inner-loading :showing="loading" class="custom-loading">
        <q-spinner-dots size="50px" color="#FFB6C1" />
      </q-inner-loading>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlayerStore } from '@/stores/playerStore'
import { musicService } from '@/services/musicService'
import { translateSongTitles } from '@/services/translateService'

const playerStore = usePlayerStore()
const { t, locale } = useI18n()

const musicList = ref([])
const loading = ref(false)
const showDemoMode = ref(false)
const loadedImages = ref({})
const activeSongId = ref(null)
const searchQuery = ref('')
const sortOption = ref('date-desc')
const translatedTitles = ref({})
const sortOptions = computed(() => [
  { label: t('common.sortByNameAsc'), value: 'name-asc' },
  { label: t('common.sortByNameDesc'), value: 'name-desc' },
  { label: t('common.sortByDateAsc'), value: 'date-asc' },
  { label: t('common.sortByDateDesc'), value: 'date-desc' }
])
const defaultCover = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjVGNUY1Ii8+PHBhdGggZmlsbD0iI0ZGQjZDNSIgZD0iTTEyIDN2MTAuNTVjLS41OS0uMzQtMS4yNy0uNTUtMi0uNTVjLTIuMjEgMC00IDEuNzktNCA0czEuNzkgNCA0IDRzNC0xLjc5IDQtNFY3aDRWMy0xMnYtMTNoLTR6Ii8+PC9zdmc+'

const filteredMusicList = computed(() => {
  let result = [...musicList.value]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(song => {
      const titleMatch = song.title.toLowerCase().includes(query)
      const translatedTitle = translatedTitles.value[song.id]
      const translatedMatch = translatedTitle && translatedTitle.toLowerCase().includes(query)
      return titleMatch || translatedMatch
    })
  }

  const [sortBy, sortOrder] = sortOption.value.split('-')
  result.sort((a, b) => {
    if (sortBy === 'name') {
      const nameA = a.title.toLowerCase()
      const nameB = b.title.toLowerCase()
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
    } else {
      const dateA = a.lastModified || 0
      const dateB = b.lastModified || 0
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    }
  })

  return result
})

async function translateAllTitles() {
  const titlesToTranslate = musicList.value.map(song => song.title)
  const translations = await translateSongTitles(titlesToTranslate)
  
  for (const song of musicList.value) {
    const translation = translations[song.title]
    if (translation) {
      translatedTitles.value[song.id] = translation
    }
  }
}

function onImageLoad(songId) {
  loadedImages.value[songId] = true
}

function onImageError(songId) {
  loadedImages.value[songId] = true
  const song = musicList.value.find(s => s.id === songId)
  if (song) {
    song.coverUrl = ''
  }
}

function onCardTouchStart(songId) {
  activeSongId.value = songId
}

function onCardTouchEnd() {
  setTimeout(() => {
    activeSongId.value = null
  }, 300)
}

function clearSearch() {
  searchQuery.value = ''
}

function getOriginalIndex(song) {
  return musicList.value.findIndex(s => s.id === song.id)
}

const demoSongs = [
  {
    id: '1',
    title: '示例歌曲 1',
    artist: '演示歌手',
    album: '演示专辑',
    duration: 180,
    coverUrl: '',
    lastModified: Date.now() - 86400000
  },
  {
    id: '2',
    title: '示例歌曲 2',
    artist: '演示歌手',
    album: '演示专辑',
    duration: 240,
    coverUrl: '',
    lastModified: Date.now() - 172800000
  },
  {
    id: '3',
    title: '示例歌曲 3',
    artist: '演示歌手',
    album: '演示专辑',
    duration: 210,
    coverUrl: '',
    lastModified: Date.now() - 259200000
  }
]

function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function loadMusicList() {
  try {
    loading.value = true
    showDemoMode.value = false
    const data = await musicService.getStaticInfo()
    const songs = data.songs || []
    if (songs && Array.isArray(songs) && songs.length > 0) {
      musicList.value = songs.map(song => ({
        id: song.songId,
        title: song.songName,
        duration: song.duration || 0,
        lastModified: song.lastModified || 0,
        coverUrl: musicService.getCoverUrl(song.songId)
      }))
      playerStore.setPlaylist(musicList.value)
      translateAllTitles()
    } else {
      showDemoMode.value = true
      musicList.value = demoSongs
      playerStore.setPlaylist(musicList.value)
      translateAllTitles()
    }
  } catch (error) {
    console.error('Failed to load music list:', error)
    showDemoMode.value = true
    musicList.value = demoSongs
    playerStore.setPlaylist(musicList.value)
    translateAllTitles()
  } finally {
    loading.value = false
  }
}

async function playSong(song, index) {
  if (showDemoMode.value) {
    return
  }
  playerStore.currentIndex = index
  await playerStore.playSong(song)
}

onMounted(() => {
  loadMusicList()
})

watch(locale, () => {
  translatedTitles.value = {}
  translateAllTitles()
})
</script>

<style scoped>
.music-list-page {
  padding: 24px;
}

.music-list-container {
  max-width: 1400px;
  margin: 0 auto;
}

.demo-banner {
  background: #FFF5F7;
  border: 1px solid #FFD1DC;
  border-radius: 12px;
  color: #616161;
  margin-bottom: 24px;
}

.controls-bar {
  display: flex;
  flex-wrap: nowrap;
  gap: 16px;
  margin-bottom: 24px;
  align-items: center;
}

.search-wrapper {
  flex: 1;
  min-width: 200px;
}

.sort-controls {
  flex-shrink: 0;
}

.search-input {
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(255, 182, 193, 0.1);
}

.search-input :deep(.q-field__control) {
  border-radius: 12px !important;
  padding: 0 8px !important;
  min-height: 48px;
  display: flex;
  align-items: center;
}

.search-input :deep(.q-field__control-container) {
  display: flex;
  align-items: center;
}

.search-input :deep(.q-field__prepend),
.search-input :deep(.q-field__append) {
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-input :deep(.q-field__prepend .q-icon),
.search-input :deep(.q-field__append .q-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.search-input :deep(.q-field__native) {
  color: #212121;
  font-size: 15px;
}

.search-input :deep(.q-field__label) {
  color: #9E9E9E;
}

.search-input :deep(.q-field--focused .q-field__label) {
  color: #FFB6C1;
}

.close-icon {
  transition: transform 0.2s ease;
}

.close-icon:hover {
  transform: scale(1.1);
}

.sort-controls {
  flex-shrink: 0;
}

.sort-select {
  min-width: 120px;
}

.sort-controls :deep(.q-field__control) {
  border-radius: 12px !important;
  padding: 0 12px !important;
}

.sort-controls :deep(.q-field__native) {
  color: #212121 !important;
}

.sort-controls :deep(.q-field__append) {
  color: #212121 !important;
}

.sort-controls :deep(.q-menu) {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(255, 182, 193, 0.2);
}

.sort-controls :deep(.q-item) {
  border-radius: 8px;
  margin: 4px;
}

.sort-controls :deep(.q-item:hover) {
  background: #FFF5F7;
}

.music-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 24px;
}

.music-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(255, 182, 193, 0.1);
}

.music-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(255, 182, 193, 0.2);
}

.music-card--active .play-overlay,
.play-overlay--visible {
  opacity: 1;
}

.music-card--active {
  background: #FFF5F7;
}

.card-cover {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #FFFAFA;
}

.cover-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(8px);
  transition: filter 0.3s ease;
}

.cover-image.loaded {
  filter: blur(0);
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 182, 193, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.music-card:hover .play-overlay {
  opacity: 1;
}

.card-info {
  margin-top: 12px;
}

.song-title {
  font-size: 14px;
  font-weight: 600;
  color: #212121;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}

.song-meta {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #9E9E9E;
}

.song-separator {
  margin: 0 4px;
  color: #BDBDBD;
}

.song-translation {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.song-updated {
  font-size: 10px;
  color: #BDBDBD;
  margin-top: 4px;
}

.empty-state {
  text-align: center;
  padding: 80px 24px;
}

.empty-text {
  font-size: 18px;
  font-weight: 600;
  color: #424242;
  margin-top: 16px;
}

.empty-subtext {
  font-size: 14px;
  color: #9E9E9E;
  margin-top: 8px;
}

.custom-loading {
  background: rgba(255, 255, 255, 0.9);
}

@media (max-width: 768px) {
  .music-list-page {
    padding: 16px;
  }
  
  .controls-bar {
    flex-wrap: nowrap;
    flex-direction: row;
    align-items: center;
  }
  
  .search-wrapper {
    min-width: 150px;
  }
  
  .sort-select {
    min-width: 100px;
  }
  
  .search-input :deep(.q-field__control) {
    min-height: 44px !important;
  }
  
  .music-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 16px;
  }
}

@media (max-width: 300px) {
  .controls-bar {
    flex-wrap: wrap;
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-wrapper {
    min-width: auto;
  }
  
  .sort-controls {
    display: flex;
    justify-content: center;
  }
}
</style>
