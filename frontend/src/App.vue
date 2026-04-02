<template>
  <div>
    <h1>zeeeestack云音乐</h1>
    <div v-if="currentSong" class="cover-container">
      <img 
        :src="coverUrl" 
        :alt="currentSong.name"
        @error="handleCoverError"
        @load="handleCoverLoad"
        class="cover-image"
        :class="{ 'cover-loading': isCoverLoading }"
      />
      <div v-if="isCoverLoading" class="cover-loading-spinner">加载中...</div>
      <div v-if="showDefaultCover" class="default-cover">
        <span>默认封面</span>
      </div>
    </div>
    <ul>
      <li v-for="song in songs" :key="song.songId" @click="playSong(song)">
        {{ song.name }}
      </li>
    </ul>
    <audio ref="audioPlayer" controls></audio>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const songs = ref([])
const audioPlayer = ref(null)
const currentSong = ref(null)
const isCoverLoading = ref(false)
const showDefaultCover = ref(false)

const coverUrl = computed(() => {
  if (!currentSong.value) return ''
  return `/api/songs/${currentSong.value.songId}/cover`
})

async function fetchSongs() {
  try {
    const response = await fetch('/api/songs')
    songs.value = await response.json()
  } catch (error) {
    console.error('Failed to fetch songs:', error)
  }
}

async function playSong(song) {
  currentSong.value = song
  isCoverLoading.value = true
  showDefaultCover.value = false
  
  try {
    const response = await fetch(`/api/songs/${song.songId}/play-url`)
    const data = await response.json()
    if (audioPlayer.value) {
      audioPlayer.value.src = data.url
      audioPlayer.value.play()
    }
  } catch (error) {
    console.error('Failed to get play URL:', error)
  }
}

function handleCoverLoad() {
  isCoverLoading.value = false
  showDefaultCover.value = false
}

function handleCoverError() {
  isCoverLoading.value = false
  showDefaultCover.value = true
}

onMounted(() => {
  fetchSongs()
})
</script>

<style scoped>
.cover-container {
  position: relative;
  width: 300px;
  height: 300px;
  margin: 20px 0;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-loading {
  opacity: 0;
}

.cover-loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 14px;
  color: #666;
}

.default-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #ccc;
}

.default-cover span {
  color: #999;
  font-size: 16px;
}

@media (max-width: 400px) {
  .cover-container {
    width: 250px;
    height: 250px;
  }
}
</style>
