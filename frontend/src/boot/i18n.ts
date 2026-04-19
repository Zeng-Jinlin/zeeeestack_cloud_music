import { boot } from 'quasar/wrappers'
import i18n, { setLanguage } from 'src/i18n'

export default boot(({ app }) => {
  // 设置 i18n 实例
  app.use(i18n)

  // 设置 HTML lang 属性
  document.documentElement.lang = i18n.global.locale.value

  // 将 $t 添加到 Vue 原型，方便在组件中使用
  app.config.globalProperties.$t = i18n.global.t
})

export { i18n, setLanguage }
