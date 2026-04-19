import { getLanguage } from '@/i18n'

const TRANSLATE_CACHE_KEY = 'song_title_translations'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000

interface TranslationCache {
  [key: string]: {
    translation: string
    timestamp: number
  }
}

function getCache(): TranslationCache {
  try {
    const cached = localStorage.getItem(TRANSLATE_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (e) {
    console.warn('Failed to get translation cache:', e)
  }
  return {}
}

function setCache(cache: TranslationCache): void {
  try {
    localStorage.setItem(TRANSLATE_CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.warn('Failed to set translation cache:', e)
  }
}

function getCacheKey(text: string, targetLang: string): string {
  return `${targetLang}:${text}`
}

function cleanExpiredCache(cache: TranslationCache): TranslationCache {
  const now = Date.now()
  const cleaned: TranslationCache = {}
  for (const key in cache) {
    if (now - cache[key].timestamp < CACHE_EXPIRY) {
      cleaned[key] = cache[key]
    }
  }
  return cleaned
}

const unsupportedLanguages = [
  'bo-CN',
  'ug-CN',
  'mn-CN',
  'ii-CN',
  'za-CN'
]

function getMyMemoryLang(locale: string): string {
  const langMap: { [key: string]: string } = {
    'en-US': 'en',
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    'es-ES': 'es',
    'fr-FR': 'fr',
    'de-DE': 'de',
    'pt-BR': 'pt-BR',
    'ru-RU': 'ru',
    'ja-JP': 'ja',
    'ko-KR': 'ko',
    'ar-SA': 'ar',
    'hi-IN': 'hi',
    'id-ID': 'id',
    'th-TH': 'th',
    'vi-VN': 'vi'
  }
  return langMap[locale] || 'en'
}

async function translateBatchWithMyMemory(texts: string[], targetLang: string): Promise<string[] | null> {
  const apiUrl = 'https://api.mymemory.translated.net/get'
  
  try {
    const joinedText = texts.join('\n')
    const params = new URLSearchParams({
      q: joinedText,
      langpair: `en-US|${targetLang}`
    })
    
    const response = await fetch(`${apiUrl}?${params.toString()}`)
    
    if (response.ok) {
      const data = await response.json()
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        const translatedText = data.responseData.translatedText
        return translatedText.split('\n')
      }
    }
  } catch (e) {
    console.warn('MyMemory batch translation failed:', e)
  }
  
  return null
}

export async function translateSongTitles(titles: string[]): Promise<{ [key: string]: string | null }> {
  const currentLang = getLanguage()
  
  let actualTargetLang = currentLang
  if (unsupportedLanguages.includes(currentLang)) {
    actualTargetLang = 'zh-CN'
  }
  
  const cache = cleanExpiredCache(getCache())
  const results: { [key: string]: string | null } = {}
  const toTranslate: string[] = []
  const toTranslateMap: { [key: number]: string } = {}
  
  for (let i = 0; i < titles.length; i++) {
    const title = titles[i]
    const cacheKey = getCacheKey(title, actualTargetLang)
    if (cache[cacheKey]) {
      results[title] = cache[cacheKey].translation
    } else {
      toTranslate.push(title)
      toTranslateMap[toTranslate.length - 1] = title
    }
  }
  
  if (toTranslate.length > 0) {
    const targetLang = getMyMemoryLang(actualTargetLang)
    const translations = await translateBatchWithMyMemory(toTranslate, targetLang)
    
    if (translations && translations.length === toTranslate.length) {
      for (let i = 0; i < translations.length; i++) {
        const originalTitle = toTranslateMap[i]
        let translation = translations[i]
        
        if (translation) {
          translation = translation.trim()
          const cacheKey = getCacheKey(originalTitle, actualTargetLang)
          cache[cacheKey] = {
            translation,
            timestamp: Date.now()
          }
          results[originalTitle] = translation
        } else {
          results[originalTitle] = null
        }
      }
      setCache(cache)
    } else {
      for (const title of toTranslate) {
        results[title] = null
      }
    }
  }
  
  return results
}

export function clearTranslationCache(): void {
  localStorage.removeItem(TRANSLATE_CACHE_KEY)
}
