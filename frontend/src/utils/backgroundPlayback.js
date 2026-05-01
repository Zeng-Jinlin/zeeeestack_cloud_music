
import { usePlayerStore } from '@/stores/playerStore'

let backgroundInterval = null
let isBackgroundActive = false

// 检查是否是Capacitor环境
const isCapacitor = () => {
  return typeof window !== 'undefined' && window.Capacitor !== undefined
}

// 保持应用活跃状态
const keepAlive = () => {
  // 简单的心跳机制，防止系统休眠
  if (document.hidden) {
    // 在后台时定期执行一些轻量操作
    const playerStore = usePlayerStore()
    if (playerStore.isPlaying) {
      // 触发一些小事件来保持进程活跃
      const event = new CustomEvent('audioKeepAlive')
      window.dispatchEvent(event)
    }
  }
}

// 初始化后台播放管理
export const initBackgroundPlayback = () => {
  if (isBackgroundActive) return
  
  isBackgroundActive = true
  
  // 监听可见性变化
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  // 设置定期保持活跃
  backgroundInterval = setInterval(keepAlive, 30000)
  
  // 在Capacitor环境中可能需要特殊处理
  if (isCapacitor()) {
    initCapacitorBackground()
  }
}

// 清理后台播放管理
export const cleanupBackgroundPlayback = () => {
  if (!isBackgroundActive) return
  
  isBackgroundActive = false
  
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  
  if (backgroundInterval) {
    clearInterval(backgroundInterval)
    backgroundInterval = null
  }
}

// 处理可见性变化
const handleVisibilityChange = () => {
  const playerStore = usePlayerStore()
  
  if (document.hidden) {
    // 进入后台
    if (playerStore.isPlaying) {
      // 确保音频继续播放
      console.log('App entered background, keeping audio playing')
    }
  } else {
    // 回到前台
    console.log('App returned to foreground')
  }
}

// 初始化Capacitor特定的后台播放
const initCapacitorBackground = () => {
  console.log('Initializing Capacitor background playback')
  // 这里可以添加Capacitor特定的后台播放插件初始化
  // 例如 @capacitor-community/media-session 或其他音频后台插件
}

// 请求后台播放权限（如果需要）
export const requestBackgroundPermission = async () => {
  // 不同平台可能需要不同的权限请求方式
  console.log('Requesting background playback permission')
  return true
}

