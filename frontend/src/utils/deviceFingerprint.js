/**
 * 设备指纹生成工具
 * 基于 Canvas、Navigator、Screen 等多维度信息生成唯一设备标识
 */

/**
 * 生成 Canvas 指纹
 * @returns {string} Canvas 指纹字符串
 */
function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(0, 0, 100, 50)
    ctx.fillStyle = '#069'
    ctx.fillText('Zeeeestack Music ☀️', 2, 3)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('Zeeeestack Music ☀️', 4, 4)
    return canvas.toDataURL()
  } catch (e) {
    return 'canvas-not-supported'
  }
}

/**
 * 生成设备指纹
 * @returns {string} 设备指纹（32 位字符串）
 */
export function generateDeviceFingerprint() {
  const components = [
    // Navigator 信息
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    navigator.hardwareConcurrency || 'unknown',
    navigator.deviceMemory || 'unknown',
    
    // Screen 信息
    screen.colorDepth,
    screen.pixelDepth,
    screen.availWidth,
    screen.availHeight,
    
    // 时区信息
    new Date().getTimezoneOffset(),
    
    // Canvas 指纹
    getCanvasFingerprint()
  ]

  // 组合所有信息并生成指纹
  const fingerprintString = components.join('|')
  
  // 使用简单的 hash 算法生成 32 位指纹
  return simpleHash(fingerprintString)
}

/**
 * 简单 Hash 算法（生成 32 位十六进制字符串）
 * @param {string} str 输入字符串
 * @returns {string} 32 位 Hash 值
 */
function simpleHash(str) {
  let hash = 0
  const result = []
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  // 生成 32 位十六进制字符串
  for (let i = 0; i < 8; i++) {
    result.push(((hash >> (i * 4)) & 0xF).toString(16))
  }
  
  // 补充时间戳增加随机性
  const timePart = Date.now().toString(36).substring(0, 8)
  return (result.join('') + timePart + 'zeeeestack').substring(0, 32)
}

/**
 * 设置 Cookie
 * @param {string} name Cookie 名称
 * @param {string} value Cookie 值
 * @param {number} days 过期天数（默认 365 天）
 */
export function setCookie(name, value, days = 365) {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  const expiresString = `expires=${expires.toUTCString()}`
  document.cookie = `${name}=${value};${expiresString};path=/;SameSite=Lax`
}

/**
 * 获取 Cookie
 * @param {string} name Cookie 名称
 * @returns {string|null} Cookie 值，不存在返回 null
 */
export function getCookie(name) {
  const nameEQ = `${name}=`
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

/**
 * 初始化设备指纹（如果不存在则生成并设置）
 */
export function initDeviceFingerprint() {
  let fingerprint = getCookie('device_fingerprint')
  
  if (!fingerprint) {
    fingerprint = generateDeviceFingerprint()
    setCookie('device_fingerprint', fingerprint, 365)
  }
  
  return fingerprint
}
