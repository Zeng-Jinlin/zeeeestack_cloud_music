import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Notify } from 'quasar'
import { i18n } from '@/i18n'
import { musicService } from '@/services/musicService'
import { preloadService, PreloadState } from '@/services/preloadService'

const PlaybackState = {
  IDLE: 'idle',
  LOADING_DATA: 'loading_data',
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
  const loadErrorKey = ref(null)
  const currentLoadController = ref(null)
  const loadTimeoutId = ref(null)
  const LOAD_TIMEOUT = 30000
  
  // 后台播放相关
  let wakeLock = null
  let backgroundKeepAliveTimer = null
  let networkListener = null
  let wasPlayingBeforeError = false
  let isNetworkOffline = false
  const audioResetKey = ref(0)
  const networkRetryCount = ref(0)
  let networkRetryTimer = null
  const NETWORK_RETRY_BASE_DELAY = 1000
  const NETWORK_RETRY_MAX_DELAY = 30000

  const preloadEnabled = ref(true)
  const preloadProgress = ref(0)
  const nextSongPreloaded = ref(false)
  let preloadTimer = null
  const PRELOAD_DELAY = 500

  const hasValidPlayUrl = computed(() => {
    if (!playUrl.value) return false
    return Date.now() < playUrlExpireTime.value
  })

  const canPlay = computed(() => {
    return currentSong.value && hasValidPlayUrl.value
  })

  const isLoading = computed(() => {
    return playbackState.value === PlaybackState.LOADING_DATA || 
           playbackState.value === PlaybackState.SWITCHING ||
           playbackState.value === PlaybackState.BUFFERING
  })

  const isPlaying = computed(() => {
    return playbackState.value === PlaybackState.PLAYING || 
           playbackState.value === PlaybackState.SWITCHING ||
           playbackState.value === PlaybackState.BUFFERING
  })
  
  // 后台播放初始化
  async function initBackgroundPlayback() {
    try {
      // 请求屏幕常亮权限
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen')
          console.log('Screen wake lock acquired for background playback')
        } catch (err) {
          console.log('Wake lock not available:', err)
        }
      }
      
      // 启动后台保持活跃定时器
      startBackgroundKeepAlive()
      
      // 监听可见性变化
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
    } catch (error) {
      console.error('Failed to initialize background playback:', error)
    }
  }
  
  // 清理后台播放
  function cleanupBackgroundPlayback() {
    if (wakeLock) {
      wakeLock.release().then(() => {
        wakeLock = null
        console.log('Wake lock released')
      })
    }
    
    stopBackgroundKeepAlive()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
  
  function initNetworkListener() {
    if (networkListener) return
    
    networkListener = () => {
      if (navigator.onLine) {
        console.log('Network online, checking playback state...')
        isNetworkOffline = false
        
        // 清除之前的重试定时器
        if (networkRetryTimer) {
          clearTimeout(networkRetryTimer)
          networkRetryTimer = null
        }
        
        // 只要有当前歌曲且没有有效播放链接，都尝试恢复
        if (currentSong.value && !hasValidPlayUrl.value) {
          networkRetryCount.value++
          console.log(`Network recovery attempt #${networkRetryCount.value}`)
          
          playbackState.value = PlaybackState.IDLE
          fetchPlayUrl(currentSong.value.id).then(() => {
            if (wasPlayingBeforeError && hasValidPlayUrl.value) {
              resume()
            }
          }).catch(() => {
            // 如果失败，延迟后继续重试
            scheduleNetworkRetry()
          })
          wasPlayingBeforeError = false
        } else if (playbackState.value === PlaybackState.ERROR && currentSong.value) {
          networkRetryCount.value++
          console.log(`Network recovery attempt #${networkRetryCount.value}`)
          
          if (hasValidPlayUrl.value) {
            console.log('Play URL still valid, resetting audio element...')
            resetAudioElement()
            playbackState.value = PlaybackState.IDLE
            if (wasPlayingBeforeError) {
              playbackState.value = PlaybackState.PLAYING
            }
            wasPlayingBeforeError = false
          } else {
            console.log('Play URL expired, fetching new one...')
            playbackState.value = PlaybackState.IDLE
            fetchPlayUrl(currentSong.value.id).then(() => {
              if (wasPlayingBeforeError && hasValidPlayUrl.value) {
                resume()
              }
            }).catch(() => {
              // 如果失败，延迟后继续重试
              scheduleNetworkRetry()
            })
            wasPlayingBeforeError = false
          }
        } else if (playbackState.value === PlaybackState.LOADING_DATA && !currentSong.value) {
          playbackState.value = PlaybackState.IDLE
        }
      } else {
        console.log('Network offline')
        isNetworkOffline = true
        networkRetryCount.value = 0
        // 清除之前的重试定时器
        if (networkRetryTimer) {
          clearTimeout(networkRetryTimer)
          networkRetryTimer = null
        }
      }
    }
    
    window.addEventListener('online', networkListener)
    window.addEventListener('offline', networkListener)
  }
  
  function scheduleNetworkRetry() {
    // 清除之前的定时器
    if (networkRetryTimer) {
      clearTimeout(networkRetryTimer)
    }
    
    // 使用指数退避策略，但有最大延迟限制
    const delay = Math.min(
      NETWORK_RETRY_BASE_DELAY * Math.pow(2, networkRetryCount.value),
      NETWORK_RETRY_MAX_DELAY
    )
    
    console.log(`Scheduling network retry in ${delay}ms...`)
    
    networkRetryTimer = setTimeout(() => {
      if (navigator.onLine && currentSong.value && !hasValidPlayUrl.value) {
        console.log(`Executing scheduled network retry #${networkRetryCount.value + 1}`)
        networkRetryCount.value++
        
        playbackState.value = PlaybackState.IDLE
        fetchPlayUrl(currentSong.value.id).then(() => {
          if (wasPlayingBeforeError && hasValidPlayUrl.value) {
            resume()
          }
        }).catch(() => {
          // 继续安排下一次重试
          scheduleNetworkRetry()
        })
        wasPlayingBeforeError = false
      }
    }, delay)
  }

  function cleanupNetworkListener() {
    if (networkListener) {
      window.removeEventListener('online', networkListener)
      window.removeEventListener('offline', networkListener)
      networkListener = null
    }
    if (networkRetryTimer) {
      clearTimeout(networkRetryTimer)
      networkRetryTimer = null
    }
    isNetworkOffline = false
    networkRetryCount.value = 0
  }

  function schedulePreload() {
    if (!preloadEnabled.value) return
    if (preloadTimer) {
      clearTimeout(preloadTimer)
    }
    preloadTimer = setTimeout(() => {
      startPreload()
    }, PRELOAD_DELAY)
  }

  async function startPreload() {
    if (!currentSong.value || playlist.value.length === 0) return
    if (playMode.value === 'single') return

    const nextSongData = preloadService.getNextSong(
      currentSong.value,
      playlist.value,
      playMode.value,
      currentIndex.value
    )

    if (!nextSongData) return

    try {
      const result = await preloadService.preloadNextSong(
        currentSong.value,
        playlist.value,
        playMode.value,
        currentIndex.value
      )

      if (result) {
        nextSongPreloaded.value = true
        preloadProgress.value = 100
      } else {
        nextSongPreloaded.value = false
        preloadProgress.value = 0
      }
    } catch (error) {
      console.error('Preload error:', error)
      nextSongPreloaded.value = false
      preloadProgress.value = 0
    }
  }

  function cancelPreload() {
    if (preloadTimer) {
      clearTimeout(preloadTimer)
      preloadTimer = null
    }
    preloadService.cancelPreload()
    nextSongPreloaded.value = false
    preloadProgress.value = 0
  }

  function clearPreloadOnPlaylistChange() {
    cancelPreload()
    preloadService.clearAll()
  }
  
  function resetAudioElement() {
    audioResetKey.value++
  }
  
  // 启动后台保持活跃
  function startBackgroundKeepAlive() {
    if (backgroundKeepAliveTimer) {
      clearInterval(backgroundKeepAliveTimer)
    }
    
    backgroundKeepAliveTimer = setInterval(() => {
      if (isPlaying.value && document.hidden) {
        // 触发轻量活动以保持进程
        const event = new CustomEvent('audio-keep-alive')
        window.dispatchEvent(event)
        
        // 播放一个静音片段保持音频会话
        if (navigator.vibrate) {
          navigator.vibrate(1)
        }
      }
    }, 15000)
  }
  
  // 停止后台保持活跃
  function stopBackgroundKeepAlive() {
    if (backgroundKeepAliveTimer) {
      clearInterval(backgroundKeepAliveTimer)
      backgroundKeepAliveTimer = null
    }
  }
  
  // 处理可见性变化
  function handleVisibilityChange() {
    if (!document.hidden) {
      // 返回前台，恢复正常播放
      console.log('App returned to foreground')
    } else {
      // 进入后台，保持播放
      console.log('App entered background, maintaining playback')
    }
  }

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
      loadErrorKey.value = 'player.playError'
      loadError.value = i18n.global.t('player.playError')
      playbackState.value = PlaybackState.ERROR
    }, LOAD_TIMEOUT)

    try {
      playbackState.value = PlaybackState.LOADING_DATA
      loadProgress.value = 0
      loadError.value = null
      loadErrorKey.value = null
      
      const response = await musicService.getPlayUrl(songId, { signal: controller.signal })
      
      if (controller.signal.aborted) {
        return null
      }

      if (response && response.playUrl) {
        // 成功获取播放链接，清除网络重试定时器
        if (networkRetryTimer) {
          clearTimeout(networkRetryTimer)
          networkRetryTimer = null
        }
        networkRetryCount.value = 0
        
        playUrl.value = response.playUrl
        playUrlExpireTime.value = Date.now() + 9 * 60 * 1000
        loadProgress.value = 100
        wasPlayingBeforeError = false
        return playUrl.value
      } else {
        throw new Error('Invalid response')
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return null
      }
      console.error('获取播放链接失败:', error)
      
      wasPlayingBeforeError = isPlaying.value
      
      if (error.notifyMessage) {
        loadErrorKey.value = error.notifyMessage
        loadError.value = i18n.global.t(error.notifyMessage)
      } else {
        loadErrorKey.value = 'player.playError'
        loadError.value = i18n.global.t('player.playError')
      }
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

    cancelPreload()

    const wasPlaying = playbackState.value === PlaybackState.PLAYING

    playbackState.value = PlaybackState.SWITCHING
    loadError.value = null
    loadErrorKey.value = null
    loadProgress.value = 0

    currentTime.value = 0
    duration.value = 0

    currentSong.value = song

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

    try {
      if (preloadService.isPreloaded(song.id)) {
        const preloadedData = preloadService.getPreloadedData()
        if (preloadedData && preloadedData.url) {
          playUrl.value = preloadedData.url
          playUrlExpireTime.value = Date.now() + 9 * 60 * 1000
          
          const preloadedAudio = preloadService.getPreloadedAudioElement()
          if (preloadedAudio) {
            preloadedAudio.currentTime = 0
          }
          
          preloadService.reset()
          preloadProgress.value = 0
          nextSongPreloaded.value = false

          playbackState.value = PlaybackState.PLAYING

          if (wasPlaying) {
            resume()
          }
          schedulePreload()
          return
        }
      }

      const url = await fetchPlayUrl(song.id)

      if (!url) {
        return
      }

      playUrl.value = url
      playUrlExpireTime.value = Date.now() + 9 * 60 * 1000

      playbackState.value = PlaybackState.BUFFERING

      if (wasPlaying) {
        resume()
      }

      schedulePreload()
    } catch (error) {
      console.error('播放歌曲失败:', error)
      playbackState.value = PlaybackState.ERROR
    }
  }

  async function togglePlay() {
    if (playbackState.value === PlaybackState.PLAYING) {
      pause()
    } else if (playbackState.value === PlaybackState.PAUSED) {
      resume()
    } else if (canPlay.value) {
      resume()
    } else if (currentSong.value) {
      // 如果有当前歌曲但没有有效播放链接，先获取播放链接
      try {
        await ensureValidPlayUrl()
        if (canPlay.value) {
          resume()
        }
      } catch (error) {
        console.error('获取播放链接失败:', error)
      }
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
        playbackState.value === PlaybackState.LOADING_DATA) {
      playbackState.value = PlaybackState.PLAYING
    }
  }

  function setPlaying() {
    playbackState.value = PlaybackState.PLAYING
  }

  function setPaused() {
    if (playbackState.value === PlaybackState.PLAYING) {
      playbackState.value = PlaybackState.PAUSED
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
    clearPreloadOnPlaylistChange()
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
    cancelPreload()
    clearPreloadOnPlaylistChange()
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
    loadErrorKey.value = null
    wasPlayingBeforeError = false
    networkRetryCount.value = 0
    preloadService.clearAll()
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
    randomPlaylist,
    randomIndex,
    loadProgress,
    loadError,
    loadErrorKey,
    hasValidPlayUrl,
    canPlay,
    isLoading,
    isPlaying,
    preloadEnabled,
    preloadProgress,
    nextSongPreloaded,
    fetchPlayUrl,
    ensureValidPlayUrl,
    playSong,
    togglePlay,
    pause,
    resume,
    stop,
    setBuffering,
    setCanPlay,
    setPlaying,
    setPaused,
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
    cancelCurrentLoad,
    initBackgroundPlayback,
    cleanupBackgroundPlayback,
    initNetworkListener,
    cleanupNetworkListener,
    audioResetKey,
    resetAudioElement,
    schedulePreload,
    cancelPreload,
    clearPreloadOnPlaylistChange,
    PreloadState
  }
})
