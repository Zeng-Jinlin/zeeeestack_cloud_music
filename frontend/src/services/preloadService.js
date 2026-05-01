import { musicService } from './musicService'

const PRELOAD_PERCENT = 0.5
const PRELOAD_CACHE_KEY = 'preloaded_audio_cache'
const PRELOAD_STATUS_KEY = 'preload_status'

export const PreloadState = {
  IDLE: 'idle',
  LOADING: 'loading',
  COMPLETED: 'completed',
  FAILED: 'failed'
}

class PreloadService {
  constructor() {
    this.currentPreloadTask = null
    this.preloadedData = null
    this.preloadedSongId = null
    this.preloadProgress = 0
    this.preloadState = PreloadState.IDLE
    this.preloadAbortController = null
    this.preloadedUrl = null
    this.preloadedAudioElement = null
  }

  async preloadNextSong(song, playlist, playMode, currentIndex) {
    const nextSong = this.getNextSong(song, playlist, playMode, currentIndex)
    if (!nextSong) {
      this.reset()
      return null
    }

    if (this.preloadedSongId === nextSong.id && this.preloadState === PreloadState.COMPLETED) {
      console.log(`Song ${nextSong.id} already preloaded`)
      return this.getPreloadedData()
    }

    this.cancelPreload()

    this.preloadedSongId = nextSong.id
    this.preloadProgress = 0
    this.preloadState = PreloadState.LOADING

    this.preloadAbortController = new AbortController()

    try {
      const response = await musicService.getPlayUrl(nextSong.id, {
        signal: this.preloadAbortController.signal
      })

      if (this.preloadAbortController.signal.aborted) {
        return null
      }

      if (response && response.playUrl) {
        this.preloadedUrl = response.playUrl
        const audio = new Audio()
        audio.crossOrigin = 'anonymous'
        
        const result = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            audio.src = ''
            reject(new Error('Preload timeout'))
          }, 45000)

          const onCanPlay = () => {
            clearTimeout(timeout)
            if (audio.buffered.length > 0) {
              const bufferedEnd = audio.buffered.end(audio.buffered.length - 1)
              const duration = audio.duration || 1
              const loadedPercent = Math.min(bufferedEnd / duration, 1)
              
              this.preloadProgress = 100
              this.preloadState = PreloadState.COMPLETED
              this.preloadedAudioElement = audio
              resolve({
                songId: nextSong.id,
                url: response.playUrl,
                audioElement: audio,
                preloadPercent: loadedPercent
              })
            }
          }

          const onCanPlayThrough = () => {
            clearTimeout(timeout)
            this.preloadProgress = 100
            this.preloadState = PreloadState.COMPLETED
            this.preloadedAudioElement = audio
            resolve({
              songId: nextSong.id,
              url: response.playUrl,
              audioElement: audio,
              preloadPercent: 1
            })
          }

          const onLoadedMetadata = () => {
            if (audio.readyState >= 3) {
              clearTimeout(timeout)
              this.preloadProgress = 100
              this.preloadState = PreloadState.COMPLETED
              this.preloadedAudioElement = audio
              resolve({
                songId: nextSong.id,
                url: response.playUrl,
                audioElement: audio,
                preloadPercent: 1
              })
            }
          }

          audio.addEventListener('canplay', onCanPlay, { once: true })
          audio.addEventListener('canplaythrough', onCanPlayThrough, { once: true })
          audio.addEventListener('loadedmetadata', onLoadedMetadata, { once: true })

          audio.addEventListener('error', (e) => {
            clearTimeout(timeout)
            audio.removeEventListener('canplay', onCanPlay)
            audio.removeEventListener('canplaythrough', onCanPlayThrough)
            audio.removeEventListener('loadedmetadata', onLoadedMetadata)
            reject(e)
          }, { once: true })

          audio.addEventListener('progress', () => {
            if (audio.buffered.length > 0) {
              const bufferedEnd = audio.buffered.end(audio.buffered.length - 1)
              const duration = audio.duration || 1
              const loadedPercent = Math.min(bufferedEnd / duration, 1)
              this.preloadProgress = Math.round(loadedPercent * 100)
              
              if (loadedPercent >= PRELOAD_PERCENT) {
                clearTimeout(timeout)
                audio.removeEventListener('canplay', onCanPlay)
                audio.removeEventListener('canplaythrough', onCanPlayThrough)
                audio.removeEventListener('loadedmetadata', onLoadedMetadata)
                this.preloadProgress = 100
                this.preloadState = PreloadState.COMPLETED
                this.preloadedAudioElement = audio
                resolve({
                  songId: nextSong.id,
                  url: response.playUrl,
                  audioElement: audio,
                  preloadPercent: loadedPercent
                })
              }
            }
          })

          audio.preload = 'auto'
          audio.src = response.playUrl
          audio.load()
        })

        this.preloadedData = result
        this.savePreloadStatus(nextSong.id, response.playUrl)
        return result

      } else {
        throw new Error('Invalid response from getPlayUrl')
      }
    } catch (error) {
      if (this.preloadAbortController.signal.aborted) {
        return null
      }
      console.error('Preload failed:', error)
      this.preloadState = PreloadState.FAILED
      this.preloadedData = null
      this.preloadedAudioElement = null
      return null
    }
  }

  getNextSong(currentSong, playlist, playMode, currentIdx) {
    if (!playlist || playlist.length === 0) return null
    if (!currentSong) return playlist[0]

    if (playMode === 'single') {
      return currentSong
    }

    if (playMode === 'random') {
      const randomList = this.getRandomPlaylist(playlist, currentSong)
      const idx = randomList.findIndex(s => s.id === currentSong.id)
      const nextIdx = (idx + 1) % randomList.length
      return randomList[nextIdx]
    }

    let nextIndex = currentIdx + 1
    if (nextIndex >= playlist.length) {
      nextIndex = 0
    }
    return playlist[nextIndex]
  }

  getRandomPlaylist(playlist, currentSong) {
    const shuffled = this.shuffleArray([...playlist])
    const idx = shuffled.findIndex(s => s.id === currentSong.id)
    if (idx !== -1) {
      const [current] = shuffled.splice(idx, 1)
      shuffled.unshift(current)
    }
    return shuffled
  }

  shuffleArray(array) {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  cancelPreload() {
    if (this.preloadAbortController) {
      this.preloadAbortController.abort()
      this.preloadAbortController = null
    }
    if (this.preloadedAudioElement) {
      this.preloadedAudioElement.src = ''
      this.preloadedAudioElement = null
    }
    this.preloadProgress = 0
    this.preloadState = PreloadState.IDLE
  }

  reset() {
    this.cancelPreload()
    this.preloadedData = null
    this.preloadedSongId = null
    this.preloadedUrl = null
    this.preloadProgress = 0
    this.preloadState = PreloadState.IDLE
  }

  clearAll() {
    this.reset()
    try {
      localStorage.removeItem(PRELOAD_STATUS_KEY)
    } catch (e) {
      console.warn('Failed to clear preload status:', e)
    }
  }

  getPreloadedData() {
    return this.preloadedData
  }

  getPreloadedAudioElement() {
    return this.preloadedAudioElement
  }

  isPreloaded(songId) {
    return this.preloadedSongId === songId && this.preloadState === PreloadState.COMPLETED
  }

  getPreloadProgress() {
    return this.preloadProgress
  }

  getPreloadState() {
    return this.preloadState
  }

  getPreloadedUrl() {
    return this.preloadedUrl
  }

  savePreloadStatus(songId, url) {
    try {
      localStorage.setItem(PRELOAD_STATUS_KEY, JSON.stringify({
        songId,
        url,
        timestamp: Date.now()
      }))
    } catch (e) {
      console.warn('Failed to save preload status:', e)
    }
  }

  getCachedPreloadStatus() {
    try {
      const cached = localStorage.getItem(PRELOAD_STATUS_KEY)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (e) {
      console.warn('Failed to get cached preload status:', e)
    }
    return null
  }
}

export const preloadService = new PreloadService()