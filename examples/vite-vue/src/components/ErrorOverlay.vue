<script setup lang="ts">
import { useErrorOverlay } from '../composables/useErrorOverlay'

const { isVisible, errorMessage, reload } = useErrorOverlay()

const goHome = () => {
  window.location.href = '/'
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950"
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-title"
    >
      <div class="max-w-md w-full text-center space-y-6">
        <!-- Error Icon -->
        <div class="text-red-500 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <!-- Title -->
        <h2 id="error-title" class="text-2xl font-bold text-white">
          Something went wrong
        </h2>

        <!-- Message -->
        <p class="text-gray-400">
          {{ errorMessage }}
        </p>

        <!-- Actions -->
        <div class="space-y-3 pt-4">
          <button
            @click="reload"
            class="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Reload Page
          </button>
          <button
            @click="goHome"
            class="w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
