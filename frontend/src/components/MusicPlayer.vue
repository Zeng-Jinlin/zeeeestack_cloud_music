<template>
  <div>
    <audio
      v-if="playerStore.playUrl"
      ref="audioRef"
      :key="playerStore.audioResetKey"
      :src="playerStore.playUrl"
      preload="auto"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @ended="onEnded"
      @error="onError"
      @waiting="onWaiting"
      @canplay="onCanPlay"
      @playing="onPlaying"
      @pause="onPause"
      @loadstart="onLoadStart"
      @progress="onProgress"
    />

    <q-footer v-if="playerStore.currentSong" elevated class="player-footer">
      <div class="player-container" :class="{ 'player-container--mobile': isMobile }">
        <SongDetail :song="playerStore.currentSong" class="song-detail-section" />

        <div v-if="isMobile" class="control-buttons-section">
          <q-btn
            unelevated
            flat
            icon="skip_previous"
            text-color="#424242"
            @click="playerStore.playPrevious"
            class="control-btn"
            style="border-radius: 12px;"
          />
          <q-btn
            unelevated
            flat
            :icon="playerStore.isPlaying ? 'pause' : 'play_arrow'"
            text-color="#FFB6C1"
            @click="playerStore.togglePlay"
            :loading="playerStore.isLoading"
            class="play-btn"
            style="border-radius: 12px;"
          />
          <q-btn
            unelevated
            flat
            icon="skip_next"
            text-color="#424242"
            @click="playerStore.playNext"
            class="control-btn"
            style="border-radius: 12px;"
          />
        </div>

        <div class="controls-section">
          <div class="progress-container">
            <span class="time-text">{{ formatTime(playerStore.currentTime) }}</span>
            <q-slider
              v-model="seekTime"
              :max="playerStore.duration"
              @input="onSliderInput"
              @change="onSliderChange"
              @mousedown="onSliderStart"
              @touchstart="onSliderStart"
              @mouseup="onSliderEnd"
              @touchend="onSliderEnd"
              class="progress-slider"
              color="#FFB6C1"
              track-color="#FFE4E9"
            />
            <span class="time-text">{{ formatTime(playerStore.duration) }}</span>
          </div>
          
          <div v-if="!isMobile" class="control-buttons">
            <q-btn
              unelevated
              flat
              icon="skip_previous"
              text-color="#424242"
              @click="playerStore.playPrevious"
              class="control-btn"
              style="border-radius: 12px;"
            />
            <q-btn
              unelevated
              flat
              :icon="playerStore.isPlaying ? 'pause' : 'play_arrow'"
              text-color="#FFB6C1"
              @click="playerStore.togglePlay"
              :loading="playerStore.isLoading"
              class="play-btn"
              style="border-radius: 12px;"
            />
            <q-btn
              unelevated
              flat
              icon="skip_next"
              text-color="#424242"
              @click="playerStore.playNext"
              class="control-btn"
              style="border-radius: 12px;"
            />
          </div>
        </div>

        <div class="right-section">
          <div class="play-mode-section">
            <q-btn
              unelevated
              flat
              :icon="playModeIcon"
              text-color="#424242"
              @click="handleTogglePlayMode"
              class="mode-btn"
              style="border-radius: 12px;"
            />
          </div>
          <div class="volume-control-wrapper" @mouseenter="onVolumeInteraction" @touchstart="onVolumeInteraction">
            <q-btn
              unelevated
              flat
              :icon="volumeIcon"
              text-color="#424242"
              @click="handleVolumeButtonClick"
              class="volume-btn"
              style="border-radius: 12px;"
            />
            <transition name="volume-slider">
              <div v-show="showVolumeSlider" class="volume-slider-container">
                <q-slider
                  v-model="volumeValue"
                  :min="0"
                  :max="1"
                  :step="0.01"
                  class="volume-slider"
                  color="#FFB6C1"
                  track-color="#FFE4E9"
                  thumb-size="0"
                  :thumb-color="'transparent'"
                  track-size="36px"
                  @update:model-value="onVolumeInteraction"
                  style="width: 120px;"
                />
              </div>
            </transition>
          </div>
        </div>
      </div>
    </q-footer>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlayerStore } from '@/stores/playerStore'
import SongDetail from './SongDetail.vue'
import { Notify } from 'quasar'
import { isMobileDevice } from '@/utils/device'

const playerStore = usePlayerStore()
const { t } = useI18n()
const audioRef = ref(null)
const seekTime = ref(0)
const volumeValue = ref(playerStore.volume)
let loadingNotify = null

const isMobile = computed(() => isMobileDevice())

const showVolumeSlider = ref(false)
let volumeHideTimer = null
const VOLUME_HIDE_DELAY = 3000

let isSeeking = false
let isRetrying = false
let lastErrorKey = null
let currentFadeOperation = null

const loadingMessage = computed(() => {
  switch (playerStore.playbackState) {
    case playerStore.PlaybackState.LOADING_DATA:
      return t('player.loadingData')
    case playerStore.PlaybackState.BUFFERING:
      return t('player.bufferingAudio')
    case playerStore.PlaybackState.SWITCHING:
      return t('player.switchingSong')
    default:
      return t('player.loadingData')
  }
})

const volumeIcon = computed(() => {
  if (playerStore.isMuted || playerStore.volume === 0) {
    return 'volume_off'
  } else if (playerStore.volume < 0.5) {
    return 'volume_down'
  } else {
    return 'volume_up'
  }
})

const playModeIcon = computed(() => {
  if (playerStore.playMode === 'random') {
    return 'shuffle'
  } else if (playerStore.playMode === 'single') {
    return 'repeat_one'
  } else {
    return 'repeat'
  }
})

const handleTogglePlayMode = () => {
  playerStore.togglePlayMode()
}

const handleVolumeButtonClick = () => {
  if (showVolumeSlider.value) {
    playerStore.toggleMute()
  } else {
    showVolumeSlider.value = true
    resetVolumeHideTimer()
  }
}

const onVolumeInteraction = () => {
  if (showVolumeSlider.value) {
    resetVolumeHideTimer()
  }
}

const resetVolumeHideTimer = () => {
  clearVolumeHideTimer()
  volumeHideTimer = setTimeout(() => {
    showVolumeSlider.value = false
  }, VOLUME_HIDE_DELAY)
}

const clearVolumeHideTimer = () => {
  if (volumeHideTimer) {
    clearTimeout(volumeHideTimer)
    volumeHideTimer = null
  }
}

const FADE_DURATION = 100

function smoothFade(targetVolume) {
  return new Promise((resolve) => {
    if (!audioRef.value) {
      resolve()
      return
    }
    
    const startVolume = audioRef.value.volume
    const startTime = Date.now()
    
    const animate = () => {
      if (!audioRef.value) {
        resolve()
        return
      }
      
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / FADE_DURATION, 1)
      audioRef.value.volume = startVolume + (targetVolume - startVolume) * progress
      
      if (progress < 1) {
        currentFadeOperation = requestAnimationFrame(animate)
      } else {
        audioRef.value.volume = targetVolume
        currentFadeOperation = null
        resolve()
      }
    }
    
    currentFadeOperation = requestAnimationFrame(animate)
  })
}

async function fadeOut() {
  if (!audioRef.value) return
  await smoothFade(0)
}

async function fadeIn(targetVolume) {
  if (!audioRef.value) return
  const finalVolume = playerStore.isMuted ? 0 : targetVolume
  audioRef.value.volume = 0
  await smoothFade(finalVolume)
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function onTimeUpdate() {
  if (!audioRef.value) return
  if (!isSeeking) {
    playerStore.setCurrentTime(audioRef.value.currentTime)
    seekTime.value = audioRef.value.currentTime
  }
}

function onLoadedMetadata() {
  if (!audioRef.value) return
  playerStore.setDuration(audioRef.value.duration)
  audioRef.value.volume = playerStore.isMuted ? 0 : playerStore.volume
}

function onEnded() {
  if (playerStore.playlist.length > 0) {
    playerStore.playNext()
  } else {
    playerStore.stop()
  }
}

function onWaiting() {
  playerStore.setBuffering()
}

function onCanPlay() {
  playerStore.setCanPlay()
}

function onPlaying() {
  playerStore.setPlaying()
}

function onPause() {
  playerStore.setPaused()
}

function onLoadStart() {
}

function onProgress() {
}

function onError() {
  if (isRetrying) return
  
  Notify.create({
    type: 'negative',
    message: t('player.playError'),
    position: 'top'
  })
  
  if (playerStore.currentSong) {
    isRetrying = true
    playerStore.fetchPlayUrl(playerStore.currentSong.id).then(() => {
      if (audioRef.value) {
        audioRef.value.load()
        if (playerStore.isPlaying) {
          audioRef.value.play().catch(() => {})
        }
      }
    }).finally(() => {
      setTimeout(() => {
        isRetrying = false
      }, 3000)
    })
  }
}

function onSliderStart() {
  isSeeking = true
}

function onSliderEnd() {
  isSeeking = false
}

function onSliderInput() {
}

function onSliderChange() {
  if (audioRef.value && seekTime.value !== undefined) {
    audioRef.value.currentTime = seekTime.value
    playerStore.setCurrentTime(seekTime.value)
    isSeeking = false
  }
}

watch(() => playerStore.isPlaying, async (newVal) => {
  if (!audioRef.value) return
  
  if (currentFadeOperation) {
    cancelAnimationFrame(currentFadeOperation)
    currentFadeOperation = null
  }
  
  if (newVal) {
    audioRef.value.volume = 0
    audioRef.value.play().catch(err => {
      console.error('播放失败:', err)
    })
    await fadeIn(playerStore.volume)
  } else {
    await fadeOut()
    audioRef.value.pause()
  }
}, { flush: 'post' })

watch(() => playerStore.playUrl, async (newUrl, oldUrl) => {
  if (!newUrl) return
  
  if (newUrl !== oldUrl) {
    await nextTick()
    
    if (!audioRef.value) return
    
    const shouldPlay = playerStore.isPlaying
    if (shouldPlay) {
      await fadeOut()
    }
    audioRef.value.pause()
    audioRef.value.load()
    if (shouldPlay) {
      audioRef.value.play().catch(err => {
        console.error('自动播放失败:', err)
      })
      await fadeIn(playerStore.volume)
    }
  }
})

watch(() => playerStore.isLoading, (newVal) => {
  if (newVal) {
    if (loadingNotify) {
      loadingNotify()
    }
    loadingNotify = Notify.create({
      type: 'ongoing',
      message: loadingMessage.value,
      position: 'top',
      spinner: true,
      spinnerColor: '#FFB6C1',
      color: '#FFE4E9',
      textColor: '#424242',
      timeout: 0
    })
  } else {
    if (loadingNotify) {
      loadingNotify()
      loadingNotify = null
    }
  }
})

watch(() => playerStore.loadErrorKey, (newVal) => {
  if (newVal && newVal !== lastErrorKey) {
    lastErrorKey = newVal
    Notify.create({
      type: 'negative',
      message: playerStore.loadError,
      position: 'top',
      icon: 'warning',
      timeout: 3000
    })
  }
})

watch(() => playerStore.playbackState, (newVal) => {
  if (newVal === playerStore.PlaybackState.LOADING_DATA || newVal === playerStore.PlaybackState.PLAYING) {
    lastErrorKey = null
  }
})

watch(volumeValue, (newVal) => {
  playerStore.setVolume(newVal)
  if (audioRef.value) {
    audioRef.value.volume = playerStore.isMuted ? 0 : newVal
  }
})

watch(() => playerStore.isMuted, (newVal) => {
  if (audioRef.value) {
    audioRef.value.volume = newVal ? 0 : playerStore.volume
  }
})

watch(() => playerStore.currentSong, (newSong, oldSong) => {
  if (newSong && newSong.id !== oldSong?.id) {
    seekTime.value = 0
  }
})

onMounted(() => {
  playerStore.initNetworkListener()
  if (playerStore.playUrl && audioRef.value) {
    audioRef.value.volume = playerStore.isMuted ? 0 : playerStore.volume
    if (playerStore.isPlaying) {
      audioRef.value.play().catch(err => {
        console.error('自动播放失败:', err)
      })
    }
  }
})

onUnmounted(() => {
  clearVolumeHideTimer()
  playerStore.cleanupNetworkListener()
  if (loadingNotify) {
    loadingNotify()
    loadingNotify = null
  }
})
</script>

<style scoped>
.player-footer {
  background: #FFFFFF;
  border-top: 1px solid #FFE4E9;
  box-shadow: 0 -4px 16px rgba(255, 182, 193, 0.15);
  padding: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.player-container {
  display: grid;
  grid-template-columns: 280px 1fr 350px;
  grid-template-rows: auto auto;
  align-items: center;
  padding: 12px 24px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  gap: 24px;
}

.player-container--mobile {
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto auto;
  gap: 12px;
  padding: 12px;
}

.song-detail-section {
  grid-row: 1 / 2;
  justify-self: start;
}

.player-container--mobile .song-detail-section {
  grid-column: 1 / 2;
  grid-row: 1 / 2;
  width: 100%;
}

.control-buttons-section {
  display: none;
}

.player-container--mobile .control-buttons-section {
  display: flex;
  grid-column: 2 / 3;
  grid-row: 1 / 2;
  justify-self: end;
  align-self: center;
  gap: 6px;
}

.controls-section {
  grid-column: 2 / 3;
  grid-row: 1 / 3;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.player-container--mobile .controls-section {
  grid-column: 1 / 3;
  grid-row: 2 / 3;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.time-text {
  font-size: 12px;
  color: #757575;
  min-width: 40px;
  text-align: center;
  flex-shrink: 0;
}

.progress-slider {
  flex: 1;
  min-width: 0;
}

.progress-slider :deep(.q-slider__thumb) {
  transition: none !important;
}

.progress-slider :deep(.q-slider__thumb-knob) {
  transition: none !important;
}

.progress-slider :deep(.q-slider__track) {
  transition: none !important;
}

.progress-slider :deep(.q-slider__track--active) {
  transition: none !important;
}

.control-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.control-btn {
  background: #FFE4E9 !important;
  box-shadow: 0 2px 8px rgba(255, 182, 193, 0.25) !important;
  transition: all 0.2s ease;
}

.control-btn:hover,
.control-btn:focus-visible {
  transform: scale(1.1);
  background: #FFD1DC !important;
  box-shadow: 0 4px 12px rgba(255, 182, 193, 0.35) !important;
}

.control-btn:active {
  transform: scale(1.05);
}

.play-btn {
  background: #FFE4E9 !important;
  box-shadow: 0 2px 8px rgba(255, 182, 193, 0.25) !important;
  transition: all 0.2s ease;
}

.play-btn:hover,
.play-btn:focus-visible {
  transform: scale(1.05);
  background: #FFD1DC !important;
  box-shadow: 0 4px 12px rgba(255, 182, 193, 0.35) !important;
}

.play-btn:active {
  transform: scale(1.02);
}

.volume-btn {
  background: #FFE4E9 !important;
  box-shadow: 0 2px 8px rgba(255, 182, 193, 0.25) !important;
  transition: all 0.2s ease;
}

.volume-btn:hover,
.volume-btn:focus-visible {
  transform: scale(1.1);
  background: #FFD1DC !important;
  box-shadow: 0 4px 12px rgba(255, 182, 193, 0.35) !important;
}

.volume-btn:active {
  transform: scale(1.05);
}

.right-section {
  grid-column: 3 / 4;
  grid-row: 1 / 2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.player-container--mobile .right-section {
  grid-column: 1 / 3;
  grid-row: 3 / 4;
  justify-self: center;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-bottom: 8px;
}

.play-mode-section {
  display: flex;
  align-items: center;
}

.player-container--mobile .play-mode-section {
  order: 1;
}

.mode-btn {
  background: #FFE4E9 !important;
  box-shadow: 0 2px 8px rgba(255, 182, 193, 0.25) !important;
  transition: all 0.2s ease;
}

.mode-btn:hover,
.mode-btn:focus-visible {
  transform: scale(1.1);
  background: #FFD1DC !important;
  box-shadow: 0 4px 12px rgba(255, 182, 193, 0.35) !important;
}

.mode-btn:active {
  transform: scale(1.05);
}

.volume-control-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
}

.player-container--mobile .volume-control-wrapper {
  order: 2;
}

.volume-slider-container {
  overflow: hidden;
  display: flex;
  align-items: center;
  height: 36px;
  padding-left: 12px;
}

.volume-slider {
  border-radius: 12px;
}

.volume-slider :deep(.q-slider__track-container) {
  border-radius: 12px;
}

.volume-slider :deep(.q-slider__track) {
  border-radius: 12px;
}

.volume-slider :deep(.q-slider__thumb) {
  display: none;
}

.volume-slider :deep(.q-slider__thumb-knob) {
  display: none;
}

.volume-slider :deep(.q-slider__track--active) {
  border-radius: 12px;
}

.volume-slider-enter-active,
.volume-slider-leave-active {
  transition: opacity 0.3s ease, max-width 0.3s ease;
}

.volume-slider-enter-from,
.volume-slider-leave-to {
  opacity: 0;
  max-width: 0;
}

.volume-slider-enter-to,
.volume-slider-leave-from {
  opacity: 1;
  max-width: 140px;
}

@media (max-width: 1200px) {
  .player-container {
    grid-template-columns: 240px 1fr 280px;
    gap: 16px;
  }
  
  .song-detail-section {
    flex: 0 0 240px;
  }
  
  .right-section {
    flex: 0 0 280px;
  }
}

@media (max-width: 992px) {
  .player-container {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto auto;
    gap: 16px;
    padding: 12px 16px;
  }
  
  .song-detail-section {
    grid-column: 1 / 2;
    grid-row: 1 / 2;
    justify-self: start;
    width: 100%;
  }
  
  .controls-section {
    grid-column: 1 / 3;
    grid-row: 2 / 3;
  }
  
  .right-section {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
    justify-self: end;
  }
}

@media (max-width: 576px) {
  .player-container--mobile {
    padding: 10px 12px;
  }
  
  .control-btn,
  .play-btn,
  .mode-btn,
  .volume-btn {
    padding: 10px !important;
    min-width: 44px !important;
    min-height: 44px !important;
    transform: none !important;
    transition: none !important;
    box-shadow: none !important;
  }
  
  .control-btn:hover,
  .control-btn:focus,
  .control-btn:active,
  .play-btn:hover,
  .play-btn:focus,
  .play-btn:active,
  .mode-btn:hover,
  .mode-btn:focus,
  .mode-btn:active,
  .volume-btn:hover,
  .volume-btn:focus,
  .volume-btn:active {
    transform: none !important;
    background: #FFE4E9 !important;
    box-shadow: none !important;
  }
  
  .volume-control-wrapper {
    gap: 4px;
  }
  
  .time-text {
    min-width: 35px;
    font-size: 11px;
  }
  
  .progress-container {
    gap: 8px;
  }
}

@media (max-width: 360px) {
  .player-container--mobile {
    padding: 8px;
  }
  
  .control-btn,
  .play-btn,
  .mode-btn,
  .volume-btn {
    padding: 8px;
    min-width: 40px;
    min-height: 40px;
  }
  
  .time-text {
    min-width: 32px;
    font-size: 10px;
  }
}
</style>
