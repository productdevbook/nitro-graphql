<template>
  <div class="feature-grid" :class="[`columns-${columns}`]">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    columns?: 2 | 3 | 4
  }>(),
  {
    columns: 3
  }
)
</script>

<style scoped>
.feature-grid {
  display: grid;
  gap: 24px;
  margin: 32px 0;
}

.feature-grid.columns-2 {
  grid-template-columns: repeat(2, 1fr);
}

.feature-grid.columns-3 {
  grid-template-columns: repeat(3, 1fr);
}

.feature-grid.columns-4 {
  grid-template-columns: repeat(4, 1fr);
}

.feature-grid :deep(.feature-item) {
  padding: 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  transition: all 0.3s;
}

.feature-grid :deep(.feature-item:hover) {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(225, 0, 152, 0.1);
  border-color: var(--vp-c-brand-1);
}

.feature-grid :deep(.feature-icon) {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--vp-c-brand-soft) 0%, var(--vp-c-purple-soft, rgba(139, 92, 246, 0.14)) 100%);
  color: var(--vp-c-brand-1);
}

.feature-grid :deep(.feature-icon svg) {
  width: 24px;
  height: 24px;
}

.feature-grid :deep(.feature-title) {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.feature-grid :deep(.feature-description) {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.feature-grid :deep(.feature-link) {
  display: inline-flex;
  align-items: center;
  margin-top: 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: color 0.3s;
}

.feature-grid :deep(.feature-link:hover) {
  color: var(--vp-c-brand-2);
}

.feature-grid :deep(.feature-link svg) {
  width: 16px;
  height: 16px;
  margin-left: 4px;
}

/* Responsive */
@media (max-width: 960px) {
  .feature-grid.columns-3,
  .feature-grid.columns-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }
}
</style>
