import { createRouter, createWebHistory } from 'vue-router'
import MusicList from '@/views/MusicList.vue'
import NotFound from '@/views/NotFound.vue'
import { i18n } from '@/i18n'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: MusicList,
      meta: {
        titleKey: 'common.pageTitleHome'
      }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFound,
      meta: {
        titleKey: 'common.pageTitleNotFound'
      }
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

function updateDocumentTitle(to) {
  if (to.meta.titleKey) {
    const title = i18n.global.t(to.meta.titleKey)
    document.title = title
  } else {
    const defaultTitle = i18n.global.t('common.pageTitle')
    document.title = defaultTitle
  }
}

router.beforeEach((to, from, next) => {
  updateDocumentTitle(to)
  next()
})

export { updateDocumentTitle }
export default router
