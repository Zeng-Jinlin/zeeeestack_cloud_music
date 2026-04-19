<template>
  <q-page class="not-found-page">
    <div class="not-found-container">
      <div class="error-code">404</div>
      
      <div class="error-icon">
        <q-icon name="music_off" size="120px" color="primary" />
      </div>
      
      <div class="error-content">
        <h1 class="error-title">{{ $t('notFound.title') || '页面未找到' }}</h1>
        <p class="error-description">
          {{ $t('notFound.description') || '抱歉，您访问的页面不存在或已被移除' }}
        </p>
        
        <div class="error-actions">
          <q-btn
            unelevated
            color="primary"
            size="lg"
            class="action-btn"
            @click="goHome"
          >
            <q-icon name="home" class="q-mr-sm" />
            {{ $t('notFound.goHome') || '返回首页' }}
          </q-btn>
          
          <q-btn
            outline
            color="primary"
            size="lg"
            class="action-btn q-ml-md"
            @click="goBack"
          >
            <q-icon name="arrow_back" class="q-mr-sm" />
            {{ $t('notFound.goBack') || '返回上页' }}
          </q-btn>
        </div>
      </div>
      
      <div class="decorative-notes">
        <q-icon name="music_note" class="note note-1" />
        <q-icon name="music_note" class="note note-2" />
        <q-icon name="music_note" class="note note-3" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push('/')
}

function goBack() {
  router.go(-1)
}
</script>

<style scoped>
.not-found-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFF5F7 0%, #FFE4E9 50%, #FFD1DC 100%);
  overflow: hidden;
}

.not-found-page :deep(.q-page) {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #FFF5F7 0%, #FFE4E9 50%, #FFD1DC 100%);
}

.not-found-container {
  text-align: center;
  position: relative;
  z-index: 2;
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-code {
  font-size: 180px;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #FFB6C1 0%, #FF69B4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  opacity: 0.3;
  position: absolute;
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
  user-select: none;
  z-index: 1;
}

.error-icon {
  margin-bottom: 32px;
  position: relative;
  z-index: 2;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

.error-content {
  position: relative;
  z-index: 2;
}

.error-title {
  font-size: 48px;
  font-weight: 700;
  color: #212121;
  margin: 0 0 16px 0;
  letter-spacing: -0.5px;
}

.error-description {
  font-size: 18px;
  color: #757575;
  margin: 0 0 40px 0;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.action-btn {
  border-radius: 12px;
  padding: 12px 32px;
  font-weight: 600;
  transition: all 0.3s ease;
  min-width: 160px;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 182, 193, 0.4);
}

.decorative-notes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.note {
  position: absolute;
  color: #FFB6C1;
  opacity: 0.3;
  animation: floatNote 4s ease-in-out infinite;
}

.note-1 {
  top: 10%;
  left: 10%;
  font-size: 48px;
  animation-delay: 0s;
}

.note-2 {
  top: 20%;
  right: 15%;
  font-size: 64px;
  animation-delay: 1s;
}

.note-3 {
  bottom: 15%;
  left: 20%;
  font-size: 56px;
  animation-delay: 2s;
}

@keyframes floatNote {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-30px) rotate(15deg);
    opacity: 0.5;
  }
}

@media (max-width: 768px) {
  .error-code {
    font-size: 120px;
    top: -50px;
  }
  
  .error-title {
    font-size: 32px;
  }
  
  .error-description {
    font-size: 16px;
    padding: 0 20px;
  }
  
  .error-actions {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
    max-width: 280px;
  }
  
  .q-ml-md {
    margin-left: 0 !important;
  }
}

@media (max-width: 480px) {
  .error-code {
    font-size: 80px;
    top: -30px;
  }
  
  .error-title {
    font-size: 24px;
  }
  
  .error-description {
    font-size: 14px;
  }
  
  .error-icon :deep(.q-icon) {
    font-size: 80px !important;
  }
}
</style>

<style>
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

#q-app {
  height: 100%;
}
</style>
