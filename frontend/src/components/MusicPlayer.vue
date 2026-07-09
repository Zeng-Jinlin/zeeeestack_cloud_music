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
          <transition 
            name="next-song-preview"
            @leave="onLeaveStart"
            @after-leave="onLeaveEnd"
          >
            <div 
              v-if="showNextSongPreview" 
              class="next-song-preview"
              :key="showNextSongPreview"
            >
              <q-icon name="queue_music" size="16px" class="preview-icon" />
              <span class="preview-text">{{ nextSongPreviewText }}</span>
            </div>
          </transition>

          <div class="progress-container">
            <span class="time-text">{{ formatTime(displayTime) }}</span>
            <div 
              class="custom-progress-bar" 
              @mousedown="onProgressBarMouseDown"
              @touchstart="onProgressBarMouseDown"
              ref="progressBarRef"
            >
              <div 
                class="progress-track"
                :class="{ 'is-playing': playerStore.isPlaying }"
                :style="{ width: progressPercent + '%' }"
              ></div>
              <div 
                class="progress-thumb"
                :class="{ 'is-playing': playerStore.isPlaying }"
                :style="{ left: progressPercent + '%' }"
              >
                <div class="thumb-glow"></div>
              </div>
              <div 
                v-if="isDragging.value" 
                class="preview-tooltip"
                :style="{ left: Math.min(progressPercent, 95) + '%' }"
              >
                {{ formatTime(seekTime.value) }}
              </div>
            </div>
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
import { getGlobalTranslations } from '@/services/translateService'

const playerStore = usePlayerStore()
const { t } = useI18n()
const audioRef = ref(null)
const seekTime = ref(0)
const volumeValue = ref(playerStore.volume)
let loadingNotify = null

const isMobile = computed(() => isMobileDevice())
const globalTranslations = getGlobalTranslations()

const showVolumeSlider = ref(false)
let volumeHideTimer = null
const VOLUME_HIDE_DELAY = 3000

const isDragging = ref(false)
const dragStartTime = ref(0)
const DRAG_THRESHOLD_MS = 150
let dragTimeout = null

let isRetrying = false
let lastErrorKey = null
let currentFadeOperation = null

const progressBarRef = ref(null)

const displayTime = computed(() => {
  return isDragging.value ? seekTime.value : playerStore.currentTime
})

const progressPercent = computed(() => {
  if (!playerStore.duration || playerStore.duration <= 0) return 0
  const time = isDragging.value ? seekTime.value : playerStore.currentTime
  return Math.min(100, Math.max(0, (time / playerStore.duration) * 100))
})

const PREVIEW_THRESHOLD = 20
const showNextSongPreview = ref(false)
const nextSongInfo = ref({ title: '', translation: '' })
let previewUpdateTimer = null

const remainingTime = computed(() => {
  if (!playerStore.duration || !playerStore.currentTime) return 0
  return Math.max(0, playerStore.duration - playerStore.currentTime)
})

const isInPreviewZone = computed(() => {
  return playerStore.isPlaying && 
         remainingTime.value > 0 && 
         remainingTime.value <= PREVIEW_THRESHOLD
})

const nextSongPreviewText = computed(() => {
  if (!nextSongInfo.value.title) return ''
  if (nextSongInfo.value.translation) {
    return `${t('player.nextSongPreview')}${nextSongInfo.value.title}(${nextSongInfo.value.translation})`
  }
  return `${t('player.nextSongPreview')}${nextSongInfo.value.title}`
})

function getNextSongInfo() {
  const playlist = playerStore.playlist
  const currentIndex = playerStore.currentIndex
  const playMode = playerStore.playMode
  
  if (!playlist || playlist.length === 0) {
    return { title: '', translation: '' }
  }
  
  if (playMode === 'single') {
    return {
      title: playerStore.currentSong?.title || '',
      translation: globalTranslations.value[playerStore.currentSong?.id] || ''
    }
  }
  
  let nextIndex
  let nextPlaylist
  
  if (playMode === 'random') {
    nextPlaylist = playerStore.randomPlaylist || []
    if (nextPlaylist.length === 0) return { title: '', translation: '' }
    const currentRandomIndex = playerStore.randomIndex
    nextIndex = currentRandomIndex + 1
    if (nextIndex >= nextPlaylist.length) nextIndex = 0
    const nextSong = nextPlaylist[nextIndex]
    return {
      title: nextSong?.title || '',
      translation: globalTranslations.value[nextSong?.id] || ''
    }
  }
  
  nextIndex = currentIndex + 1
  if (nextIndex >= playlist.length) nextIndex = 0
  const nextSong = playlist[nextIndex]
  return {
    title: nextSong?.title || '',
    translation: globalTranslations.value[nextSong?.id] || ''
  }
}

function updateNextSongPreview() {
  const info = getNextSongInfo()
  nextSongInfo.value = info
  
  if (isInPreviewZone.value) {
    showNextSongPreview.value = !!info.title
  } else {
    showNextSongPreview.value = false
  }
}

function hideNextSongPreview() {
  showNextSongPreview.value = false
  nextSongInfo.value = { title: '', translation: '' }
}

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
  if (!isDragging.value) {
    playerStore.setCurrentTime(audioRef.value.currentTime)
    seekTime.value = audioRef.value.currentTime
    updateNextSongPreview()
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

function onLeaveStart(el) {
  el.style.animation = 'none'
}

function onLeaveEnd(el) {
  el.style.maxHeight = '0'
  el.style.padding = '0 16px'
  el.style.marginBottom = '0'
  el.style.opacity = '0'
}

function calculateSeekTime(event) {
  if (!progressBarRef.value || !playerStore.duration || playerStore.duration <= 0) {
    return 0
  }
  
  const rect = progressBarRef.value.getBoundingClientRect()
  const clientX = event.clientX || (event.touches && event.touches[0]?.clientX) || 0
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  
  return percent * playerStore.duration
}

function onProgressBarMouseDown(e) {
  // 阻止默认行为防止页面滚动
  e.preventDefault()
  
  isDragging.value = true
  dragStartTime.value = Date.now()
  
  seekTime.value = calculateSeekTime(e)
  
  document.addEventListener('mousemove', onProgressBarMouseMove)
  document.addEventListener('mouseup', onProgressBarMouseUp)
  document.addEventListener('touchmove', onProgressBarMouseMove, { passive: false })
  document.addEventListener('touchend', onProgressBarMouseUp)
  document.addEventListener('touchcancel', onProgressBarMouseUp)
}

function onProgressBarMouseMove(e) {
  if (!isDragging.value) return
  
  e.preventDefault()
  
  seekTime.value = calculateSeekTime(e)
  
  // 更新最后操作时间
  lastDragTime = Date.now()
  
  const now = Date.now()
  if (now - dragStartTime.value >= DRAG_THRESHOLD_MS) {
    if (audioRef.value && !isNaN(seekTime.value)) {
      audioRef.value.currentTime = seekTime.value
      playerStore.setCurrentTime(seekTime.value)
    }
  }
}

function onProgressBarMouseUp() {
  if (!isDragging.value) return
  
  if (audioRef.value && !isNaN(seekTime.value)) {
    audioRef.value.currentTime = seekTime.value
    playerStore.setCurrentTime(seekTime.value)
  }
  
  isDragging.value = false
  
  // 清除超时
  if (dragTimeout) {
    clearTimeout(dragTimeout)
    dragTimeout = null
  }
  
  document.removeEventListener('mousemove', onProgressBarMouseMove)
  document.removeEventListener('mouseup', onProgressBarMouseUp)
  document.removeEventListener('touchmove', onProgressBarMouseMove)
  document.removeEventListener('touchend', onProgressBarMouseUp)
  document.removeEventListener('touchcancel', onProgressBarMouseUp)
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

watch(() => playerStore.playbackState, async (newState, oldState) => {
  if (!audioRef.value) return
  
  if (currentFadeOperation) {
    cancelAnimationFrame(currentFadeOperation)
    currentFadeOperation = null
  }
  
  if (newState === playerStore.PlaybackState.PLAYING) {
    audioRef.value.volume = 0
    audioRef.value.play().catch(err => {
      console.error('播放失败:', err)
    })
    await fadeIn(playerStore.volume)
  } else if (newState === playerStore.PlaybackState.PAUSED && oldState !== playerStore.PlaybackState.SWITCHING) {
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
    hideNextSongPreview()
  }
})

watch(() => playerStore.playMode, () => {
  updateNextSongPreview()
})

watch(() => playerStore.isPlaying, (newVal) => {
  if (!newVal) {
    hideNextSongPreview()
  } else {
    updateNextSongPreview()
  }
})

watch(() => playerStore.currentIndex, () => {
  hideNextSongPreview()
})

watch(seekTime, (newVal, oldVal) => {
  if (Math.abs(newVal - oldVal) > 1) {
    updateNextSongPreview()
  }
})

// 拖动超时保护
let lastDragTime = 0
const DRAG_TIMEOUT = 3000

watch(isDragging, (dragging) => {
  if (dragging) {
    lastDragTime = Date.now()
    const checkTimeout = () => {
      if (isDragging.value) {
        const elapsed = Date.now() - lastDragTime
        if (elapsed >= DRAG_TIMEOUT) {
          isDragging.value = false
        } else {
          requestAnimationFrame(checkTimeout)
        }
      }
    }
    requestAnimationFrame(checkTimeout)
  }
})

let handleDocumentMouseUp

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
  
  // 监听 document 的 mouseup 作为兜底，确保 isSeeking 状态正确
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

.custom-progress-bar {
  flex: 1;
  min-width: 0;
  height: 10px;
  background: #FFE4E9;
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  overflow: visible;
}

.custom-progress-bar:hover .progress-track {
  background: linear-gradient(135deg, #FFF5F7 0%, #FFE4E9 100%);
}

.progress-track {
  height: 100%;
  background: linear-gradient(135deg, #FFF5F7 0%, #FFE4E9 100%);
  border-radius: 3px;
  position: relative;
  transition: background 0.2s ease;
  overflow: hidden;
}

.progress-track.is-playing::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  animation: progressShine 2s linear infinite;
}

@keyframes progressShine {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.progress-thumb {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: #FFB6C1;
  border-radius: 3px;
  opacity: 1;
  transition: transform 0.1s ease, box-shadow 0.2s ease;
}

.thumb-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  background: radial-gradient(circle, rgba(255, 182, 193, 0.6) 0%, transparent 70%);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.custom-progress-bar:hover .thumb-glow,
.progress-thumb.is-playing .thumb-glow {
  opacity: 1;
}

.custom-progress-bar:hover .progress-thumb,
.progress-thumb.is-playing {
  transform: translate(-50%, -50%) scale(1.3);
  box-shadow: 0 0 10px rgba(255, 182, 193, 0.5);
}

.custom-progress-bar:active .progress-thumb,
.progress-thumb.is-playing:active {
  transform: translate(-50%, -50%) scale(1.5);
  box-shadow: 0 0 15px rgba(255, 182, 193, 0.7);
}

.preview-tooltip {
  position: absolute;
  top: -28px;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #FFFFFF;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
}

.preview-tooltip::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid rgba(0, 0, 0, 0.8);
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
  position: relative;
  overflow: hidden;
}

.play-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: radial-gradient(circle, rgba(255, 182, 193, 0.6) 0%, transparent 70%);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.4s ease, height 0.4s ease;
}

.play-btn:active::before {
  width: 150%;
  height: 150%;
}

.play-btn:hover,
.play-btn:focus-visible {
  transform: scale(1.08);
  background: #FFD1DC !important;
  box-shadow: 0 4px 12px rgba(255, 182, 193, 0.35) !important;
}

.play-btn:active {
  transform: scale(1.02);
}

.play-btn.is-playing {
  animation: playBtnPulse 1.5s ease-in-out infinite;
}

@keyframes playBtnPulse {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(255, 182, 193, 0.25) !important;
  }
  50% {
    box-shadow: 0 2px 16px rgba(255, 105, 180, 0.4) !important;
  }
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

.next-song-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #FFF5F7 0%, #FFE4E9 100%);
  border-radius: 20px;
  box-shadow: 
    0 0 8px rgba(255, 182, 193, 0.3),
    0 0 15px rgba(255, 182, 193, 0.2),
    0 0 25px rgba(255, 182, 193, 0.1);
  margin-bottom: 8px;
  position: relative;
  animation: fogGlow 2s linear infinite;
}

@keyframes fogGlow {
  0%, 100% {
    box-shadow: 
      0 0 8px rgba(255, 182, 193, 0.3),
      0 0 15px rgba(255, 182, 193, 0.2),
      0 0 25px rgba(255, 182, 193, 0.1);
  }
  50% {
    box-shadow: 
      0 0 12px rgba(255, 182, 193, 0.4),
      0 0 20px rgba(255, 182, 193, 0.25),
      0 0 30px rgba(255, 182, 193, 0.15);
  }
}

.next-song-preview::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  padding: 2px;
  background: linear-gradient(
    90deg,
    rgba(255, 182, 193, 0.4),
    rgba(255, 182, 193, 0.6),
    rgba(255, 182, 193, 0.4),
    rgba(255, 182, 193, 0.6),
    rgba(255, 182, 193, 0.4)
  );
  background-size: 200% 100%;
  animation: borderFlow 2s linear infinite;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  filter: blur(1px);
}

@keyframes borderFlow {
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 200% 0%;
  }
}

.preview-icon {
  color: #FFB6C1;
  flex-shrink: 0;
}

.preview-text {
  font-size: 13px;
  color: #616161;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.next-song-preview-enter-active,
.next-song-preview-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.next-song-preview-enter-from {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
  padding: 0 16px;
  margin-bottom: 0;
  box-shadow: none;
}

.next-song-preview-enter-to {
  opacity: 1;
  transform: translateY(0);
  max-height: 50px;
  padding: 8px 16px;
  margin-bottom: 8px;
}

.next-song-preview-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 50px;
  padding: 8px 16px;
  margin-bottom: 8px;
}

.next-song-preview-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
  padding: 0 16px;
  margin-bottom: 0;
  box-shadow: none;
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
  
  .next-song-preview {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .preview-icon {
    font-size: 14px;
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
