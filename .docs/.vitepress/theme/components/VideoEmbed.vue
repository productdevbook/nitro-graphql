<template>
  <div class="video-embed">
    <div class="video-header" v-if="title">
      <h3>{{ title }}</h3>
      <p v-if="description">{{ description }}</p>
    </div>
    <div class="video-container">
      <div class="video-wrapper">
        <iframe
          v-if="provider === 'youtube'"
          :src="`https://www.youtube.com/embed/${videoId}`"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
        <iframe
          v-else-if="provider === 'twitter'"
          :src="`https://platform.twitter.com/embed/Tweet.html?id=${videoId}`"
          frameborder="0"
          allowfullscreen
        ></iframe>
        <div v-else class="video-placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <p>Video: {{ title || 'Video Tutorial' }}</p>
          <a v-if="url" :href="url" target="_blank" class="video-link">Watch Video</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title?: string
  description?: string
  url?: string
  provider?: 'youtube' | 'twitter' | 'custom'
}>()

const videoId = computed(() => {
  if (!props.url) return ''

  if (props.provider === 'youtube') {
    const match = props.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
    return match ? match[1] : ''
  }

  if (props.provider === 'twitter') {
    const match = props.url.match(/status\/(\d+)/)
    return match ? match[1] : ''
  }

  return ''
})
</script>

<style scoped>
.video-embed {
  margin: 32px 0;
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.video-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.video-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.video-header p {
  margin: 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.video-container {
  padding: 20px;
}

.video-wrapper {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
  height: 0;
  overflow: hidden;
  border-radius: 8px;
  background-color: var(--vp-c-bg);
}

.video-wrapper iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 8px;
}

.video-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--vp-c-brand-soft) 0%, var(--vp-c-purple-soft, rgba(139, 92, 246, 0.14)) 100%);
  color: var(--vp-c-text-1);
}

.video-placeholder svg {
  margin-bottom: 16px;
  color: var(--vp-c-brand-1);
}

.video-placeholder p {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
}

.video-link {
  display: inline-block;
  padding: 8px 16px;
  background-color: var(--vp-c-brand-1);
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 500;
  transition: background-color 0.3s;
}

.video-link:hover {
  background-color: var(--vp-c-brand-2);
}
</style>
