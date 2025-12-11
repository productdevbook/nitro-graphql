<script setup lang="ts">
import ErrorOverlay from './components/ErrorOverlay.vue'
import { useErrorOverlay } from './composables/useErrorOverlay'

const { isVisible } = useErrorOverlay()
</script>

<template>
  <router-view v-if="!isVisible" />
  <ErrorOverlay />
</template>
