export function isMobileDevice() {
  if (typeof window === 'undefined') return false
  
  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
  
  return mobileRegex.test(userAgent) || window.innerWidth <= 768
}

export function isTouchDevice() {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export function getSafeAreaBottom() {
  if (typeof window === 'undefined') return 0
  const safeArea = getComputedStyle(document.documentElement).getPropertyValue('--sat')
  return safeArea ? parseInt(safeArea) : 0
}
