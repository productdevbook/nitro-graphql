<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center p-8">
    <div class="max-w-2xl w-full space-y-8">
      <!-- 404 Header -->
      <div class="text-center space-y-4">
        <div class="text-8xl font-bold text-blue-500">404</div>

        <h1 class="text-4xl font-bold text-white">
          Page Not Found
        </h1>

        <p class="text-xl text-gray-400">
          The page you're looking for doesn't exist.
        </p>
      </div>

      <!-- Actions -->
      <div class="flex gap-4 justify-center">
        <button
          @click="goHome"
          class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
        >
          Go to Home
        </button>
      </div>
    </div>
  </div>
</template>
