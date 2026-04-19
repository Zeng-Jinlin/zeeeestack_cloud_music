import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar, Notify, Dark } from 'quasar'
import { i18n, setLanguage } from './i18n'
import quasarLang from 'quasar/lang/zh-CN'
import { initDeviceFingerprint } from './utils/deviceFingerprint'

import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'

import App from './App.vue'
import router from './router'

initDeviceFingerprint()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(Quasar, {
  plugins: {
    Notify,
    Dark
  },
  lang: quasarLang,
  config: {
    dark: 'false',
    brand: {
      primary: '#FFB6C1',
      secondary: '#FFD1DC',
      accent: '#FF69B4',
      dark: '#212121',
      positive: '#4ECDC4',
      negative: '#FF6B6B',
      info: '#45B7D1',
      warning: '#FFE66D'
    }
  }
})

Dark.set(false)

app.config.globalProperties.$t = i18n.global.t

app.mount('#app')

export { setLanguage }
