<template>
  <q-layout view="hHh lpR fFf" class="app-layout">
    <q-header elevated class="app-header">
      <q-toolbar class="app-toolbar">
        <div class="row items-center full-width header-content">
          <img :src="logoSvg" alt="logo" class="app-logo" />
          <q-toolbar-title class="app-title">
            zeeeestack {{ $t('common.cloudMusic') }}
          </q-toolbar-title>
          <div class="language-selector">
            <q-select
              v-model="currentLang"
              :options="supportedLanguages"
              option-value="code"
              option-label="label"
              emit-value
              map-options
              borderless
              dense
              class="language-select"
              @update:model-value="changeLanguage"
            >
              <template v-slot:prepend>
                <q-icon name="language" />
              </template>
            </q-select>
          </div>
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container class="app-page-container">
      <router-view />
    </q-page-container>

    <MusicPlayer />
  </q-layout>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import MusicPlayer from '@/components/MusicPlayer.vue'
import logoSvg from '@/assets/logo.svg'
import { setLanguage, i18n, SUPPORTED_LANGUAGES } from '@/i18n'
import { updateDocumentTitle } from '@/router'

const $q = useQuasar()
const route = useRoute()
const currentLang = ref(i18n.global.locale.value)
const supportedLanguages = SUPPORTED_LANGUAGES

function changeLanguage(lang) {
  setLanguage(lang)
  currentLang.value = lang
  updateDocumentTitle(route)
}

watch(() => i18n.global.locale.value, () => {
  updateDocumentTitle(route)
})

onMounted(() => {
  $q.dark.set(false)
})
</script>

<style scoped>
.app-layout {
  background: linear-gradient(135deg, #FFFAFA 0%, #FFF5F7 100%);
}

.app-header {
  background: #FFFFFF;
  box-shadow: 0 2px 12px rgba(255, 182, 193, 0.15);
  border-bottom: 1px solid #FFE4E9;
}

.app-toolbar {
  padding: 0 24px;
}

.app-logo {
  width: 40px;
  height: 40px;
  margin-right: 16px;
  border-radius: 10px;
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  color: #212121;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-page-container {
  padding-bottom: 100px;
}

.language-selector {
  margin-left: auto;
}

.language-selector .language-select {
  min-width: 100px;
}

.language-selector :deep(.q-field__control) {
  border-radius: 12px !important;
  padding: 0 12px !important;
}

.language-selector :deep(.q-field__native) {
  color: #212121 !important;
}

.language-selector :deep(.q-field__append) {
  color: #212121 !important;
}

.language-selector :deep(.q-menu) {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(255, 182, 193, 0.2);
}

.language-selector :deep(.q-item) {
  border-radius: 8px;
  margin: 4px;
}

.language-selector :deep(.q-item:hover) {
  background: #FFF5F7;
}

@media (max-width: 768px) {
  .app-toolbar {
    padding: 0 12px;
  }
  
  .app-logo {
    width: 32px;
    height: 32px;
    margin-right: 12px;
  }
  
  .app-title {
    font-size: 16px;
  }
  
  .language-selector .language-select {
    min-width: 80px;
  }
}

@media (max-width: 480px) {
  .app-title {
    font-size: 14px;
  }
  
  .app-logo {
    width: 28px;
    height: 28px;
    margin-right: 8px;
  }
  
  .language-selector :deep(.q-field__control) {
    padding: 0 8px !important;
  }
}

@media (max-width: 300px) {
  .app-title {
    display: none;
  }
}
</style>

<style>
html {
  overflow-y: auto;
}

body {
  color-scheme: light only !important;
}

.body--dark,
.body--dark * {
  background-color: #FFFFFF !important;
  color: #212121 !important;
}

.body--dark {
  background: #FFFFFF !important;
  color: #212121 !important;
}

.body--dark .q-header,
.body--dark .q-footer,
.body--dark .q-drawer {
  background: #FFFFFF !important;
  color: #212121 !important;
}

.body--dark .q-card {
  background: #FFFFFF !important;
  color: #212121 !important;
}

.body--dark .q-list {
  background: #FFFFFF !important;
  color: #212121 !important;
}

.body--dark .q-item {
  color: #212121 !important;
}

.body--dark .q-field__control,
.body--dark .q-field__native,
.body--dark .q-field__append {
  background: #FFFFFF !important;
  color: #212121 !important;
  border-color: #FFE4E9 !important;
}

.body--dark .q-field__label {
  color: #757575 !important;
}

.body--dark .q-field--focused .q-field__label {
  color: #FFB6C1 !important;
}

.body--dark .q-menu,
.body--dark .q-menu__content {
  background: #FFFFFF !important;
  color: #212121 !important;
}

.body--dark .q-menu .q-item {
  background: transparent !important;
  color: #212121 !important;
}

.body--dark .q-menu .q-item:hover {
  background: #FFF5F7 !important;
}

.body--dark .q-btn {
  color: #212121 !important;
}

.body--dark .q-icon {
  color: #212121 !important;
}

.body--dark .q-slider__track {
  background: #FFE4E9 !important;
}

.body--dark .q-slider__track--active {
  background: #FFB6C1 !important;
}

html::-webkit-scrollbar,
body::-webkit-scrollbar,
.q-layout::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>
