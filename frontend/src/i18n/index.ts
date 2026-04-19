import { createI18n } from 'vue-i18n'
import enUS from './en-US.json'
import zhCN from './zh-CN.json'
import zhTW from './zh-TW.json'
import esES from './es-ES.json'
import frFR from './fr-FR.json'
import deDE from './de-DE.json'
import ptBR from './pt-BR.json'
import ruRU from './ru-RU.json'
import jaJP from './ja-JP.json'
import koKR from './ko-KR.json'
import arSA from './ar-SA.json'
import hiIN from './hi-IN.json'
import idID from './id-ID.json'
import thTH from './th-TH.json'
import viVN from './vi-VN.json'
import boCN from './bo-CN.json'
import ugCN from './ug-CN.json'
import mnCN from './mn-CN.json'
import iiCN from './ii-CN.json'
import zaCN from './za-CN.json'

// 支持的语言列表
export type SupportedLocale = 
  | 'en-US'   // English
  | 'zh-CN'   // 简体中文
  | 'zh-TW'   // 繁體中文
  | 'es-ES'   // Español
  | 'fr-FR'   // Français
  | 'de-DE'   // Deutsch
  | 'pt-BR'   // Português (Brasil)
  | 'ru-RU'   // Русский
  | 'ja-JP'   // 日本語
  | 'ko-KR'   // 한국어
  | 'ar-SA'   // العربية
  | 'hi-IN'   // हिन्दी
  | 'id-ID'   // Bahasa Indonesia
  | 'th-TH'   // ไทย
  | 'vi-VN'   // Tiếng Việt
  | 'bo-CN'   // 藏语
  | 'ug-CN'   // 维吾尔语
  | 'mn-CN'   // 蒙古语
  | 'ii-CN'   // 彝语
  | 'za-CN'   // 壮语

// 语言信息
export interface LanguageInfo {
  code: SupportedLocale
  label: string
  flag: string
}

// 支持的语言列表 - 按要求的顺序排列，使用该语言自己的名称
export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en-US', label: 'English', flag: 'blue' },
  { code: 'zh-CN', label: '简体中文', flag: 'red' },
  { code: 'zh-TW', label: '繁體中文', flag: 'red' },
  { code: 'es-ES', label: 'Español', flag: 'yellow' },
  { code: 'fr-FR', label: 'Français', flag: 'blue' },
  { code: 'de-DE', label: 'Deutsch', flag: 'yellow' },
  { code: 'pt-BR', label: 'Português (Brasil)', flag: 'green' },
  { code: 'ru-RU', label: 'Русский', flag: 'blue' },
  { code: 'ja-JP', label: '日本語', flag: 'red' },
  { code: 'ko-KR', label: '한국어', flag: 'blue' },
  { code: 'ar-SA', label: 'العربية', flag: 'green' },
  { code: 'hi-IN', label: 'हिन्दी', flag: 'green' },
  { code: 'id-ID', label: 'Bahasa Indonesia', flag: 'red' },
  { code: 'th-TH', label: 'ไทย', flag: 'blue' },
  { code: 'vi-VN', label: 'Tiếng Việt', flag: 'red' },
  { code: 'bo-CN', label: 'བོད་ཡིག', flag: 'red' },
  { code: 'ug-CN', label: 'ئۇيغۇرچە', flag: 'blue' },
  { code: 'mn-CN', label: 'Монгол', flag: 'blue' },
  { code: 'ii-CN', label: 'ꆈꌠꁱꂷ', flag: 'red' },
  { code: 'za-CN', label: 'Vahcuengh', flag: 'red' }
]

// 获取系统语言
function getSystemLanguage() {
  // 1. 如果是 Capacitor 原生 App，尝试从设备获取语言
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    // 原生 App 环境，使用 navigator.language（来自系统设置）
    return navigator.language
  }

  // 2. 网页浏览器环境
  if (typeof navigator !== 'undefined') {
    return navigator.language
  }

  // 3. 兜底：默认英文
  return 'en-US'
}

// 解析语言代码，返回最匹配的语言包
function parseLanguage(lang: string): SupportedLocale {
  if (!lang) return 'en-US'

  const normalizedLang = lang.toLowerCase()

  // 英文匹配
  if (normalizedLang.startsWith('en')) {
    return 'en-US'
  }

  // 简体中文匹配
  if (normalizedLang.startsWith('zh-cn') || 
      normalizedLang.startsWith('zh-hans') ||
      normalizedLang === 'zh-cn') {
    return 'zh-CN'
  }

  // 繁体中文匹配
  if (normalizedLang.startsWith('zh-tw') || 
      normalizedLang.startsWith('zh-hant') ||
      normalizedLang === 'zh-tw') {
    return 'zh-TW'
  }

  // 中文默认简体
  if (normalizedLang.startsWith('zh')) {
    return 'zh-CN'
  }

  // 西班牙文匹配
  if (normalizedLang.startsWith('es')) {
    return 'es-ES'
  }

  // 法文匹配
  if (normalizedLang.startsWith('fr')) {
    return 'fr-FR'
  }

  // 德文匹配
  if (normalizedLang.startsWith('de')) {
    return 'de-DE'
  }

  // 葡萄牙文匹配
  if (normalizedLang.startsWith('pt')) {
    return 'pt-BR'
  }

  // 俄文匹配
  if (normalizedLang.startsWith('ru')) {
    return 'ru-RU'
  }

  // 日文匹配
  if (normalizedLang.startsWith('ja')) {
    return 'ja-JP'
  }

  // 韩文匹配
  if (normalizedLang.startsWith('ko')) {
    return 'ko-KR'
  }

  // 阿拉伯文匹配
  if (normalizedLang.startsWith('ar')) {
    return 'ar-SA'
  }

  // 印地文匹配
  if (normalizedLang.startsWith('hi')) {
    return 'hi-IN'
  }

  // 印尼文匹配
  if (normalizedLang.startsWith('id')) {
    return 'id-ID'
  }

  // 泰文匹配
  if (normalizedLang.startsWith('th')) {
    return 'th-TH'
  }

  // 越南文匹配
  if (normalizedLang.startsWith('vi')) {
    return 'vi-VN'
  }

  // 藏文匹配
  if (normalizedLang.startsWith('bo')) {
    return 'bo-CN'
  }

  // 维吾尔文匹配
  if (normalizedLang.startsWith('ug')) {
    return 'ug-CN'
  }

  // 蒙古文匹配
  if (normalizedLang.startsWith('mn')) {
    return 'mn-CN'
  }

  // 彝文匹配
  if (normalizedLang.startsWith('ii')) {
    return 'ii-CN'
  }

  // 壮文匹配
  if (normalizedLang.startsWith('za')) {
    return 'za-CN'
  }

  // 默认英文
  return 'en-US'
}

// 从本地存储获取用户选择的语言
function getStoredLanguage(): string | null {
  try {
    return localStorage.getItem('quasar-language')
  } catch (e) {
    return null
  }
}

// 保存用户选择的语言到本地存储
function setStoredLanguage(lang: string): void {
  try {
    localStorage.setItem('quasar-language', lang)
  } catch (e) {
    console.warn('Failed to store language preference:', e)
  }
}

// 获取最终使用的语言
function getFinalLanguage(): SupportedLocale {
  // 1. 优先使用用户手动选择的语言
  const storedLang = getStoredLanguage()
  if (storedLang) {
    return parseLanguage(storedLang)
  }

  // 2. 使用系统语言
  const systemLang = getSystemLanguage()
  return parseLanguage(systemLang)
}

const messages = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'es-ES': esES,
  'fr-FR': frFR,
  'de-DE': deDE,
  'pt-BR': ptBR,
  'ru-RU': ruRU,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'ar-SA': arSA,
  'hi-IN': hiIN,
  'id-ID': idID,
  'th-TH': thTH,
  'vi-VN': viVN,
  'bo-CN': boCN,
  'ug-CN': ugCN,
  'mn-CN': mnCN,
  'ii-CN': iiCN,
  'za-CN': zaCN
}

export const i18n = createI18n({
  locale: getFinalLanguage(),
  fallbackLocale: 'en-US',
  legacy: false, // 使用 Composition API
  messages
})

// 导出语言切换函数
export function setLanguage(locale: SupportedLocale) {
  i18n.global.locale.value = locale
  setStoredLanguage(locale)
  document.documentElement.lang = locale
}

// 导出获取当前语言函数
export function getLanguage(): string {
  return i18n.global.locale.value
}

export default i18n
