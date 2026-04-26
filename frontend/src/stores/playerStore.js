import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Notify } from 'quasar'
import { i18n } from '@/i18n'
import { musicService } from '@/services/musicService'

const PlaybackState = {
  IDLE: 'idle',
  LOADING: 'loading',
  BUFFERING: 'buffering',
  PLAYING: 'playing',
  PAUSED: 'paused',
  SWITCHING: 'switching',
  ERROR: 'error'
}

function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function showSuccessNotification(message, icon) {
  Notify.create({
    type: 'positive',
    message: message,
    position: 'top',
    timeout: 2000,
    color: '#FFB6C1',
    textColor: 'white',
    icon: icon
  })
}

export const usePlayerStore = defineStore('player', () => {
  const currentSong = ref(null)
  const playUrl = ref('')
  const playUrlExpireTime = ref(0)
  const playbackState = ref(PlaybackState.IDLE)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(0.8)
  const isMuted = ref(false)
  const playlist = ref([])
  const currentIndex = ref(-1)
  const playMode = ref('sequence')
  
  const randomPlaylist = ref([])
  const randomIndex = ref(-1)
  
  const loadProgress = ref(0)
  const loadError = ref(null)
  const currentLoadController = ref(null)
  const loadTimeoutId = ref(null)
  const LOAD_TIMEOUT = 30000

  const hasValidPlayUrl = computed(() => {
    if (!playUrl.value) return false
    return Date.now() < playUrlExpireTime.value
  })

  const canPlay = computed(() => {
    return currentSong.value && hasValidPlayUrl.value
  })

  const isLoading = computed(() => {
    return playbackState.value === PlaybackState.LOADING || 
           playbackState.value === PlaybackState.SWITCHING ||
           playbackState.value === PlaybackState.BUFFERING
  })

  const isPlaying = computed(() => {
    return playbackState.value === PlaybackState.PLAYING
  })

  function cancelCurrentLoad() {
    if (currentLoadController.value) {
      currentLoadController.value.abort()
      currentLoadController.value = null
    }
    if (loadTimeoutId.value) {
      clearTimeout(loadTimeoutId.value)
      loadTimeoutId.value = null
    }
  }

  async function fetchPlayUrl(songId) {
    cancelCurrentLoad()
    
    const controller = new AbortController()
    currentLoadController.value = controller
    
    loadTimeoutId.value = setTimeout(() => {
      controller.abort()
      loadError.value = '加载超时，请重试'
      playbackState.value = PlaybackState.ERROR
    }, LOAD_TIMEOUT)

    try {
      playbackState.value = PlaybackState.LOADING
      loadProgress.value = 0
      loadError.value = null
      
      const response = await musicService.getPlayUrl(songId, { signal: controller.signal })
      
      if (controller.signal.aborted) {
        return null
      }

      if (response && response.playUrl) {
        playUrl.value = response.playUrl
        playUrlExpireTime.value = Date.now() + 9 * 60 * 1000
        loadProgress.value = 100
        return playUrl.value
      } else {
        throw new Error('Invalid response')
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return null
      }
      console.error('获取播放链接失败:', error)
      loadError.value = error.message || '获取播放链接失败'
      playbackState.value = PlaybackState.ERROR
      playUrl.value = ''
      throw error
    } finally {
      if (currentLoadController.value === controller) {
        currentLoadController.value = null
      }
      if (loadTimeoutId.value) {
        clearTimeout(loadTimeoutId.value)
        loadTimeoutId.value = null
      }
    }
  }

  async function ensureValidPlayUrl() {
    if (!hasValidPlayUrl.value && currentSong.value) {
      await fetchPlayUrl(currentSong.value.id)
    }
  }

  function generateRandomPlaylist() {
    if (playlist.value.length === 0) return
    randomPlaylist.value = shuffleArray(playlist.value)
    
    if (currentSong.value) {
      const currentInRandom = randomPlaylist.value.findIndex(s => s.id === currentSong.value.id)
      if (currentInRandom !== -1) {
        randomIndex.value = currentInRandom
      } else {
        randomIndex.value = 0
      }
    } else {
      randomIndex.value = 0
    }
  }

  async function playSong(song) {
    if (currentSong.value && currentSong.value.id === song.id) {
      if (playbackState.value === PlaybackState.PAUSED) {
        resume()
      }
      return
    }

    cancelCurrentLoad()
    
    const previousState = playbackState.value
    playbackState.value = PlaybackState.SWITCHING
    loadError.value = null
    loadProgress.value = 0

    try {
      currentSong.value = song
      
      const url = await fetchPlayUrl(song.id)
      
      if (!url) {
        return
      }

      playbackState.value = PlaybackState.PLAYING
      currentTime.value = 0
      
      if (playMode.value === 'sequence' && playlist.value.length > 0) {
        currentIndex.value = playlist.value.findIndex(s => s.id === song.id)
      } else if (playMode.value === 'random') {
        if (randomPlaylist.value.length === 0) {
          generateRandomPlaylist()
        } else {
          const idx = randomPlaylist.value.findIndex(s => s.id === song.id)
          if (idx !== -1) {
            randomIndex.value = idx
          }
        }
      }
    } catch (error) {
      console.error('播放歌曲失败:', error)
      if (playbackState.value === PlaybackState.SWITCHING) {
        playbackState.value = previousState
      }
    }
  }

  function togglePlay() {
    if (playbackState.value === PlaybackState.PLAYING) {
      pause()
    } else if (playbackState.value === PlaybackState.PAUSED) {
      resume()
    } else if (canPlay.value) {
      resume()
    } else {
      ensureValidPlayUrl().then(() => {
        if (canPlay.value) {
          resume()
        }
      })
    }
  }

  function pause() {
    if (playbackState.value === PlaybackState.PLAYING) {
      playbackState.value = PlaybackState.PAUSED
    }
  }

  function resume() {
    if (canPlay.value) {
      playbackState.value = PlaybackState.PLAYING
    }
  }

  function stop() {
    cancelCurrentLoad()
    playbackState.value = PlaybackState.IDLE
    currentTime.value = 0
  }

  function setBuffering() {
    if (playbackState.value === PlaybackState.PLAYING) {
      playbackState.value = PlaybackState.BUFFERING
    }
  }

  function setCanPlay() {
    if (playbackState.value === PlaybackState.BUFFERING || 
        playbackState.value === PlaybackState.LOADING) {
      playbackState.value = PlaybackState.PLAYING
    }
  }

  function setCurrentTime(time) {
    currentTime.value = time
  }

  function setDuration(time) {
    duration.value = time
  }

  function setVolume(vol) {
    volume.value = Math.max(0, Math.min(1, vol))
    if (volume.value > 0) {
      isMuted.value = false
    }
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
  }

  function setPlaylist(songs) {
    playlist.value = songs
    
    if (playMode.value === 'random') {
      generateRandomPlaylist()
    }
  }

  const togglePlayMode = () => {
    const modes = ['sequence', 'random', 'single']
    const currentIdx = modes.indexOf(playMode.value)
    playMode.value = modes[(currentIdx + 1) % modes.length]
    
    const modeConfig = {
      'sequence': { name: i18n.global.t('player.sequence'), icon: 'repeat' },
      'random': { name: i18n.global.t('player.random'), icon: 'shuffle' },
      'single': { name: i18n.global.t('player.single'), icon: 'repeat_one' }
    }
    showSuccessNotification(modeConfig[playMode.value].name, modeConfig[playMode.value].icon)
    
    if (playMode.value === 'random') {
      generateRandomPlaylist()
    }
  }

  const setPlayMode = (mode) => {
    playMode.value = mode
    if (mode === 'random') {
      generateRandomPlaylist()
    }
  }

  async function playNext() {
    if (playlist.value.length === 0) return
    
    if (playMode.value === 'single') {
      await playSong(playlist.value[currentIndex.value])
      return
    }
    
    if (playMode.value === 'random') {
      if (randomPlaylist.value.length === 0) {
        generateRandomPlaylist()
      }
      
      let nextIdx = randomIndex.value + 1
      if (nextIdx >= randomPlaylist.value.length) {
        nextIdx = 0
      }
      randomIndex.value = nextIdx
      await playSong(randomPlaylist.value[nextIdx])
    } else {
      let nextIndexVal = currentIndex.value + 1
      if (nextIndexVal >= playlist.value.length) {
        nextIndexVal = 0
      }
      currentIndex.value = nextIndexVal
      await playSong(playlist.value[nextIndexVal])
    }
  }

  async function playPrevious() {
    if (playlist.value.length === 0) return
    
    if (playMode.value === 'single') {
      await playSong(playlist.value[currentIndex.value])
      return
    }
    
    if (playMode.value === 'random') {
      if (randomPlaylist.value.length === 0) {
        generateRandomPlaylist()
      }
      
      let prevIdx = randomIndex.value - 1
      if (prevIdx < 0) {
        prevIdx = randomPlaylist.value.length - 1
      }
      randomIndex.value = prevIdx
      await playSong(randomPlaylist.value[prevIdx])
    } else {
      let prevIndexVal = currentIndex.value - 1
      if (prevIndexVal < 0) {
        prevIndexVal = playlist.value.length - 1
      }
      currentIndex.value = prevIndexVal
      await playSong(playlist.value[prevIndexVal])
    }
  }

  function clearPlayer() {
    cancelCurrentLoad()
    currentSong.value = null
    playUrl.value = ''
    playUrlExpireTime.value = 0
    playbackState.value = PlaybackState.IDLE
    currentTime.value = 0
    duration.value = 0
    currentIndex.value = -1
    randomPlaylist.value = []
    randomIndex.value = -1
    loadProgress.value = 0
    loadError.value = null
  }

  return {
    currentSong,
    playUrl,
    playUrlExpireTime,
    playbackState,
    PlaybackState,
    currentTime,
    duration,
    volume,
    isMuted,
    playlist,
    currentIndex,
    playMode,
    loadProgress,
    loadError,
    hasValidPlayUrl,
    canPlay,
    isLoading,
    isPlaying,
    fetchPlayUrl,
    ensureValidPlayUrl,
    playSong,
    togglePlay,
    pause,
    resume,
    stop,
    setBuffering,
    setCanPlay,
    setCurrentTime,
    setDuration,
    setVolume,
    toggleMute,
    togglePlayMode,
    setPlayMode,
    setPlaylist,
    playNext,
    playPrevious,
    clearPlayer,
    cancelCurrentLoad
  }
})
