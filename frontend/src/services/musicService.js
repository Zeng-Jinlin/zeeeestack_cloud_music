import api from './api'

export const musicService = {
  getMusicList() {
    return api.get('/songs')
  },

  getStaticInfo() {
    return api.get('/static-info')
  },

  getMusicDetail(songId) {
    return api.get(`/songs/${songId}`)
  },

  getPlayUrl(songId, options = {}) {
    const config = {}
    if (options.signal) {
      config.signal = options.signal
    }
    return api.get(`/songs/${songId}/play-url`, config)
  },

  getCoverUrl(songId) {
    return `/api/songs/${songId}/cover`
  }
}
