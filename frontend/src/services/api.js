import axios from 'axios'
import { Notify } from 'quasar'

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
    let message = '请求失败'
    
    if (status === 404) {
      message = '接口不存在 (404)'
    } else if (status === 500) {
      message = '服务器错误 (500)'
    } else if (error.message.includes('timeout')) {
      message = '请求超时'
    } else if (error.message.includes('Network Error')) {
      message = '网络连接失败，请检查后端服务是否启动'
    } else {
      message = error.response?.data?.message || error.message || '请求失败'
    }
    
    Notify.create({
      type: 'negative',
      message: message,
      position: 'top',
      timeout: 3000
    })
    
    return Promise.reject(error)
  }
)

export default api
