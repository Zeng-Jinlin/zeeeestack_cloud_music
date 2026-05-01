import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000
})

api.interceptors.request.use(
  config => {
    return config
  },
  error => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    })
    
    const status = error.response?.status
    let messageKey = 'notifications.generalError'
    
    if (status === 404) {
      messageKey = 'notifications.apiNotFound'
    } else if (status === 500) {
      messageKey = 'notifications.serverError'
    } else if (error.message.includes('timeout')) {
      messageKey = 'notifications.requestTimeout'
    } else if (error.message.includes('Network Error')) {
      messageKey = 'notifications.networkError'
    } else {
      messageKey = 'notifications.generalError'
    }
    
    error.notifyMessage = messageKey
    return Promise.reject(error)
  }
)

export default api
