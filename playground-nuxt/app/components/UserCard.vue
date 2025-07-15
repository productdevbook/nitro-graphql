<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span class="text-white font-semibold text-sm">{{ user.name.charAt(0).toUpperCase() }}</span>
        </div>
        <div>
          <h3 class="font-semibold text-gray-900">{{ user.name }}</h3>
          <p class="text-sm text-gray-600">{{ user.email }}</p>
          <p class="text-xs text-gray-500">{{ formatDate(user.createdAt) }}</p>
        </div>
      </div>
      
      <div class="flex space-x-2">
        <button 
          @click="$emit('edit', user)"
          class="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          title="Edit user"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button 
          @click="$emit('delete', user.id)"
          class="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
          title="Delete user"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GetUsersQuery } from '#graphql/client'

interface Props {
  user: GetUsersQuery['users'][0]
}

defineProps<Props>()
defineEmits<{
  edit: [user: GetUsersQuery['users'][0]]
  delete: [id: string]
}>()

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>