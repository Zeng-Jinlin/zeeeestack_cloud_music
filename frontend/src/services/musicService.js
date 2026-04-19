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

  getPlayUrl(songId) {
    return api.get(`/songs/${songId}/play-url`)
  },

  getCoverUrl(songId) {
    return `/api/songs/${songId}/cover`
  }
}
