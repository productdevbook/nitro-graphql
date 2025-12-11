<script setup lang="ts">
import type { CommitInfo } from '../../../metadata/types'
import { computed } from 'vue'
import ChangelogEntry from './ChangelogEntry.vue'
import changelogData from 'virtual:changelog'

const props = defineProps<{ fn: string }>()

// Case-insensitive search for changelog data
const fnLower = props.fn.toLowerCase()
const key = Object.keys(changelogData).find(k => k.toLowerCase() === fnLower) || props.fn
const allCommits = (changelogData[key] || []) as CommitInfo[]

const commits = computed(() => {
  // VueUse logic: Filter out version tags that have no commits after them
  // (i.e., consecutive version tags where the second one should be hidden)
  return allCommits.filter((i, idx) => {
    // If this is a version AND the next item is also a version, hide this one
    if (i.version && allCommits[idx + 1]?.version)
      return false
    return true
  })
})
</script>

<template>
  <em v-if="!commits.length" class="no-changes">No recent changes</em>

  <div class="changelog-grid">
    <ChangelogEntry
      v-for="(commit, idx) of commits"
      :key="commit.hash"
      :pending="idx === 0"
      :commit="commit"
      :function-name="fn"
    />
  </div>
</template>

<style scoped>
.no-changes {
  opacity: 0.7;
}

.changelog-grid {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 0.5rem 0.75rem;
  position: relative;
  align-items: center;
  padding-left: 6px;
}

.changelog-grid > :deep(*) {
  display: flex;
  align-items: center;
}

/* Vertical connecting line between icons */
.changelog-grid::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--vp-c-divider);
  opacity: 0.3;
  z-index: 0;
}
</style>
