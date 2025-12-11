<script setup lang="ts">
import type { CommitInfo } from '../../../metadata/types'
import type { PropType } from 'vue'
import { computed, onMounted, shallowRef } from 'vue'
import { renderCommitMessage } from '../utils'

const props = defineProps({
  commit: {
    type: Object as PropType<CommitInfo>,
    required: true,
  },
  pending: {
    type: Boolean,
    default: false,
  },
  functionName: {
    type: String,
    required: true,
  },
})

const datetime = shallowRef('')

const isoDateTime = computed(() => {
  return new Date(props.commit?.date).toISOString()
})

onMounted(() => {
  datetime.value = new Intl.DateTimeFormat().format(new Date(props.commit?.date))
})
</script>

<template>
  <template v-if="commit.version">
    <div class="mt-1" />
    <div class="mt-1" />
    <div class="icon-wrapper">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M14.064 0h.186C15.216 0 16 .784 16 1.75v.186a8.752 8.752 0 0 1-2.564 6.186l-.458.459c-.314.314-.641.616-.979.904v3.207c0 .608-.315 1.172-.833 1.49l-2.774 1.707a.749.749 0 0 1-1.11-.418l-.954-3.102a1.214 1.214 0 0 1-.145-.519V12h3.5a.75.75 0 0 0 0-1.5h-3.5v-2.25a.75.75 0 0 0-1.5 0v2.25h-2a.75.75 0 0 0 0 1.5h2v.75c0 .69.56 1.25 1.25 1.25h.186a.748.748 0 0 0-.112.23l-.954 3.102a.747.747 0 0 1-1.11.418l-2.774-1.707a1.75 1.75 0 0 1-.833-1.49v-3.207a24.97 24.97 0 0 1-.979-.904l-.458-.459A8.749 8.749 0 0 1 0 1.936V1.75C0 .784.784 0 1.75 0h.186a8.749 8.749 0 0 1 6.186 2.564l.458.459c.314.314.616.641.904.979h3.207c.608 0 1.172.315 1.49.833l1.48 2.4a.75.75 0 0 1-.8 1.14l-1.388-.555a2.257 2.257 0 0 0-1.594 0l-.555.222a.75.75 0 0 1-.8-1.14l1.48-2.4Z" />
      </svg>
    </div>
    <div>
      <a
        :href="`https://github.com/productdevbook/nitro-graphql/releases/tag/v${commit.version}`"
        target="_blank"
        class="version-link"
      >
        <code class="version-code">{{ commit.version }}</code>
      </a>
      <span class="version-date"> on <time :datetime="isoDateTime">{{ datetime }}</time></span>
    </div>
  </template>
  <template v-else>
    <div class="icon-commit">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
      </svg>
    </div>
    <div class="commit-content">
      <a :href="`https://github.com/productdevbook/nitro-graphql/commit/${commit.hash}`" target="_blank" class="commit-link">
        <code class="commit-hash">{{ commit.hash.slice(0, 5) }}</code>
      </a>
      <span class="commit-text">
        <span v-html="renderCommitMessage(commit.message.replace(`(${functionName})`, ''))" />
      </span>
    </div>
  </template>
</template>

<style scoped>
.mt-1 {
  margin-top: 0.25rem;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: var(--vp-c-bg);
  border: 1px solid rgba(156, 163, 175, 0.2);
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0.9;
  position: relative;
  z-index: 1;
}

.icon-wrapper svg {
  width: 14px;
  height: 14px;
}

.icon-commit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  background-color: var(--vp-c-bg);
  border-radius: 50%;
}

.icon-commit svg {
  width: 14px;
  height: 14px;
  transform: rotate(90deg);
  opacity: 0.3;
}

.version-link {
  text-decoration: none;
}

.version-code {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  font-size: 0.9375rem;
  transition: opacity 0.2s ease;
}

.version-link:hover .version-code {
  opacity: 0.8;
}

.version-date {
  opacity: 0.6;
  font-size: 0.8125rem;
  color: var(--vp-c-text-2);
}

.commit-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.commit-link {
  text-decoration: none;
  flex-shrink: 0;
}

.commit-hash {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: var(--vp-c-default-soft);
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.commit-link:hover .commit-hash {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.commit-text {
  font-size: 15px;
  line-height: 1.6;
  color: var(--vp-c-text-1);
}

.commit-text :deep(code) {
  font-size: 0.8125rem;
  font-weight: 500;
  background: var(--vp-code-bg);
  color: var(--vp-code-color);
  padding: 2px 6px;
  border-radius: 4px;
}

.commit-text :deep(a) {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.2s ease;
}

.commit-text :deep(a:hover) {
  opacity: 0.8;
  text-decoration: underline;
}
</style>
