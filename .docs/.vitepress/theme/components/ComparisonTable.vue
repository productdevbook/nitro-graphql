<template>
  <div class="comparison-table-wrapper">
    <table class="comparison-table">
      <thead>
        <tr>
          <th class="feature-column">{{ featureLabel || 'Feature' }}</th>
          <th v-for="(column, index) in columns" :key="index" class="option-column">
            {{ column }}
          </th>
        </tr>
      </thead>
      <tbody>
        <slot></slot>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  columns: string[]
  featureLabel?: string
}>()
</script>

<style scoped>
.comparison-table-wrapper {
  margin: 24px 0;
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--vp-c-bg);
}

.comparison-table thead {
  background-color: var(--vp-c-bg-soft);
}

.comparison-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  color: var(--vp-c-text-1);
  border-bottom: 2px solid var(--vp-c-divider);
}

.feature-column {
  min-width: 200px;
  background-color: var(--vp-c-bg-soft);
}

.option-column {
  text-align: center !important;
  min-width: 150px;
}

.comparison-table :deep(tbody tr) {
  border-bottom: 1px solid var(--vp-c-divider);
  transition: background-color 0.3s;
}

.comparison-table :deep(tbody tr:hover) {
  background-color: var(--vp-c-bg-soft);
}

.comparison-table :deep(tbody td) {
  padding: 12px 16px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.comparison-table :deep(tbody td:first-child) {
  font-weight: 500;
  color: var(--vp-c-text-1);
  background-color: var(--vp-c-bg-soft);
}

.comparison-table :deep(tbody td:not(:first-child)) {
  text-align: center;
}

/* Check and X Icons */
.comparison-table :deep(.check) {
  color: var(--vp-c-accent-1);
  font-weight: 600;
}

.comparison-table :deep(.cross) {
  color: var(--vp-c-danger-1);
  font-weight: 600;
}

.comparison-table :deep(.partial) {
  color: var(--vp-c-warning-1);
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .comparison-table th,
  .comparison-table :deep(td) {
    padding: 8px 12px;
    font-size: 13px;
  }

  .feature-column {
    min-width: 150px;
  }

  .option-column {
    min-width: 100px;
  }
}
</style>
