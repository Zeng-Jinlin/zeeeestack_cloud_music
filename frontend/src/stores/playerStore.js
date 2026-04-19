import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Notify } from 'quasar'
import { i18n } from '@/i18n'
import { musicService } from '@/services/musicService'

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
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(0.8)
  const isMuted = ref(false)
  const playlist = ref([])
  const currentIndex = ref(-1)
  const isLoading = ref(false)
  const playMode = ref('sequence')
  
  const randomPlaylist = ref([])
  const randomIndex = ref(-1)

  const hasValidPlayUrl = computed(() => {
    if (!playUrl.value) return false
    return Date.now() < playUrlExpireTime.value
  })

  const canPlay = computed(() => {
    return currentSong.value && hasValidPlayUrl.value
  })

  async function fetchPlayUrl(songId) {
    try {
      isLoading.value = true
      const response = await musicService.getPlayUrl(songId)
      if (response && response.playUrl) {
        playUrl.value = response.playUrl
        playUrlExpireTime.value = Date.now() + 9 * 60 * 1000
        return playUrl.value
      } else {
        throw new Error('Invalid response')
      }
    } catch (error) {
      console.error('获取播放链接失败:', error)
      playUrl.value = ''
      throw error
    } finally {
      isLoading.value = false
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
    try {
      currentSong.value = song
      await fetchPlayUrl(song.id)
      if (playUrl.value) {
        isPlaying.value = true
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
      }
    } catch (error) {
      console.error('播放歌曲失败:', error)
    }
  }

  function togglePlay() {
    if (!canPlay.value) {
      ensureValidPlayUrl().then(() => {
        if (canPlay.value) {
          isPlaying.value = !isPlaying.value
        }
      })
      return
    }
    isPlaying.value = !isPlaying.value
  }

  function pause() {
    isPlaying.value = false
  }

  function resume() {
    if (canPlay.value) {
      isPlaying.value = true
    }
  }

  function stop() {
    isPlaying.value = false
    currentTime.value = 0
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
    currentSong.value = null
    playUrl.value = ''
    playUrlExpireTime.value = 0
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    currentIndex.value = -1
    randomPlaylist.value = []
    randomIndex.value = -1
  }

  return {
    currentSong,
    playUrl,
    playUrlExpireTime,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playlist,
    currentIndex,
    isLoading,
    playMode,
    hasValidPlayUrl,
    canPlay,
    fetchPlayUrl,
    ensureValidPlayUrl,
    playSong,
    togglePlay,
    pause,
    resume,
    stop,
    setCurrentTime,
    setDuration,
    setVolume,
    toggleMute,
    togglePlayMode,
    setPlayMode,
    setPlaylist,
    playNext,
    playPrevious,
    clearPlayer
  }
})
