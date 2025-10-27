<template>
  <div class="code-playground">
    <div class="playground-header">
      <div class="playground-title">
        <slot name="title">{{ title }}</slot>
      </div>
      <div class="playground-actions">
        <button
          v-if="playgroundUrl"
          class="action-button"
          title="Open in Playground"
          @click="openPlayground"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </button>
        <button
          class="action-button copy-button"
          title="Copy Code"
          @click="copyCode"
        >
          <svg v-if="!copied" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      </div>
    </div>
    <div class="playground-content">
      <slot></slot>
    </div>
    <div v-if="$slots.description" class="playground-description">
      <slot name="description"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  title?: string
  playgroundUrl?: string
}>()

const copied = ref(false)

function copyCode() {
  const codeElement = document.querySelector('.code-playground .playground-content pre code')
  if (codeElement) {
    navigator.clipboard.writeText(codeElement.textContent || '')
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

function openPlayground() {
  if (props.playgroundUrl) {
    window.open(props.playgroundUrl, '_blank')
  }
}
</script>

<style scoped>
.code-playground {
  margin: 24px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--vp-c-bg-soft);
}

.playground-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}

.playground-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--vp-c-text-1);
}

.playground-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background-color: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.3s;
}

.action-button:hover {
  background-color: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.copy-button svg {
  transition: transform 0.2s;
}

.copy-button:active svg {
  transform: scale(0.9);
}

.playground-content {
  padding: 0;
}

.playground-content :deep(div[class*='language-']) {
  margin: 0;
  border-radius: 0;
}

.playground-description {
  padding: 12px 16px;
  background-color: var(--vp-c-bg);
  border-top: 1px solid var(--vp-c-divider);
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.playground-description :deep(p) {
  margin: 0;
}
</style>
