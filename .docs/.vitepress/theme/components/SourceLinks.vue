<script setup lang="ts">
import { computed } from 'vue'
import metadata from 'virtual:metadata'

const props = defineProps<{
  fn: string
}>()

const functionData = computed(() => {
  // Case-insensitive search
  const fnLower = props.fn.toLowerCase()
  const found = Object.values(metadata.functions).find(
    f => f.name.toLowerCase() === fnLower
  )
  return found || metadata.functions[props.fn]
})

const links = computed(() => {
  const data = functionData.value
  if (!data)
    return []

  const result = []

  // Source link (GitHub)
  if (data.source) {
    result.push({
      text: 'Source',
      href: data.source,
      icon: '📄',
    })
  }
  else {
    // Default to searching in src/utils
    result.push({
      text: 'Source',
      href: `https://github.com/productdevbook/nitro-graphql/blob/main/src/utils/define.ts`,
      icon: '📄',
    })
  }

  // Demo link
  if (data.demo) {
    result.push({
      text: 'Demo',
      href: data.demo,
      icon: '🎮',
    })
  }

  // Docs link (always available - current page)
  result.push({
    text: 'Docs',
    href: data.docs || '#',
    icon: '📖',
  })

  return result
})
</script>

<template>
  <div class="source-links">
    <a
      v-for="link in links"
      :key="link.text"
      :href="link.href"
      class="source-link"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span class="icon">{{ link.icon }}</span>
      <span class="text">{{ link.text }}</span>
      <span class="external-icon">↗</span>
    </a>
  </div>
</template>

<style scoped>
.source-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 1rem 0;
}

.source-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-decoration: none;
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.source-link:hover {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.icon {
  font-size: 1.125rem;
  line-height: 1;
}

.text {
  line-height: 1;
}

.external-icon {
  font-size: 0.75rem;
  opacity: 0.6;
}

.source-link:hover .external-icon {
  opacity: 1;
}
</style>
