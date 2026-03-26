<template>
  <view class="container">
    <view class="title">zeeeestack云音乐</view>
    <view v-if="currentSong" class="cover-container">
      <image 
        :src="coverUrl" 
        mode="aspectFill"
        class="cover-image"
        :class="{ 'cover-loading': isCoverLoading }"
        @error="handleCoverError"
        @load="handleCoverLoad"
      />
      <view v-if="isCoverLoading" class="cover-loading-spinner">加载中...</view>
      <view v-if="showDefaultCover" class="default-cover">
        <text>默认封面</text>
      </view>
    </view>
    <scroll-view scroll-y class="song-list">
      <view 
        v-for="song in songs" 
        :key="song.songId" 
        class="song-item"
        @click="playSong(song)"
      >
        <text>{{ song.name }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const songs = ref([])
const currentSong = ref(null)
const isCoverLoading = ref(false)
const showDefaultCover = ref(false)
let innerAudioContext = null

const coverUrl = computed(() => {
  if (!currentSong.value) return ''
  return `/api/songs/${currentSong.value.songId}/cover`
})

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: url,
      method: options.method || 'GET',
      data: options.data,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(`Request failed with status ${res.statusCode}`))
        }
      },
      fail: reject
    })
  })
}

async function fetchSongs() {
  try {
    const data = await request('/api/songs')
    songs.value = data
  } catch (error) {
    console.error('Failed to fetch songs:', error)
  }
}

async function playSong(song) {
  currentSong.value = song
  isCoverLoading.value = true
  showDefaultCover.value = false
  
  try {
    const data = await request(`/api/songs/${song.songId}/play-url`)
    if (innerAudioContext) {
      innerAudioContext.stop()
    }
    innerAudioContext.src = data.url
    innerAudioContext.play()
  } catch (error) {
    console.error('Failed to get play URL:', error)
  }
}

function handleCoverLoad() {
  isCoverLoading.value = false
  showDefaultCover.value = false
}

function handleCoverError() {
  isCoverLoading.value = false
  showDefaultCover.value = true
}

onMounted(() => {
  innerAudioContext = uni.createInnerAudioContext()
  fetchSongs()
})

onUnmounted(() => {
  if (innerAudioContext) {
    innerAudioContext.destroy()
  }
})
</script>

<style scoped>
.container {
  padding: 20rpx;
  background-color: #F8F8F8;
  min-height: 100vh;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 40rpx;
  color: #333;
}

.cover-container {
  position: relative;
  width: 600rpx;
  height: 600rpx;
  margin: 0 auto 40rpx;
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
  display: block;
}

.cover-loading {
  opacity: 0;
}

.cover-loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 28rpx;
  color: #666;
}

.default-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx dashed #ccc;
}

.default-cover text {
  color: #999;
  font-size: 32rpx;
}

.song-list {
  height: 600rpx;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
}

.song-item {
  padding: 30rpx 20rpx;
  border-bottom: 1rpx solid #eee;
  cursor: pointer;
}

.song-item:last-child {
  border-bottom: none;
}

.song-item text {
  font-size: 32rpx;
  color: #333;
}

@media (max-width: 400px) {
  .cover-container {
    width: 500rpx;
    height: 500rpx;
  }
}
</style>
