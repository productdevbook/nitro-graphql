<script setup lang="ts">
import { ref } from 'vue'
import { useUser } from '../graphql'

defineProps({
  msg: String,
})

const count = ref(0)

// Pinia Colada ile user data fetch
const { user, isLoading: loading, error, refetch } = useUser()
</script>

<template>
  <div class="space-y-8">
    <h1 class="text-5xl font-bold text-white">{{ msg }}</h1>

    <!-- GraphQL User Data -->
    <div class="p-6 bg-gray-800/50 rounded-lg border border-gray-700 min-h-60 flex flex-col">
      <h2 class="text-xl font-semibold text-white mb-4">GraphQL SDK Demo</h2>

      <div v-if="loading" class="text-gray-400">
        Loading user data...
      </div>

      <div v-else-if="error" class="text-red-400">
        Error: {{ error.message }}
      </div>

      <div v-else-if="user" class="space-y-2 text-gray-300">
        <p><span class="text-gray-400">ID:</span> {{ user.id }}</p>
        <p><span class="text-gray-400">Name:</span> {{ user.name }}</p>
        <p><span class="text-gray-400">Email:</span> {{ user.email }}</p>
      </div>

      <button
        @click="refetch()"
        class="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded transition-colors duration-200"
      >
        Refresh
      </button>
    </div>

    <!-- Counter -->
    <div class="space-y-4">
      <button
        type="button"
        @click="count++"
        class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-blue-500/50"
      >
        count is {{ count }}
      </button>
    </div>
  </div>
</template>
