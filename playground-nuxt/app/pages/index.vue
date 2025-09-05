<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">
          Nuxt + nitro-graphql
        </h1>
        <p class="text-gray-600">
          Modern GraphQL integration with automatic type generation
        </p>
      </div>

      <!-- Navigation Links -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Users</p>
              <p class="text-2xl font-semibold text-gray-900">{{ userCount }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Layer Posts</p>
              <p class="text-sm text-gray-900">
                <NuxtLink to="/posts" class="text-purple-600 hover:text-purple-800">View Posts</NuxtLink>
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">GraphQL Playground</p>
              <p class="text-sm text-gray-900">
                <a href="/api/graphql" target="_blank" class="text-green-600 hover:text-green-800">Open Playground</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="bg-white rounded-lg shadow">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900">User Management</h2>
            <button
              @click="refreshUsers"
              :disabled="isLoadingUsers"
              class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <svg v-if="isLoadingUsers" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isLoadingUsers ? 'Loading...' : 'Refresh' }}
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Users List -->
            <div>
              <h3 class="text-lg font-medium text-gray-900 mb-4">Users List</h3>
              <div v-if="isLoadingUsers" class="text-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p class="mt-2 text-gray-500">Loading users...</p>
              </div>
              <div v-else-if="users.length === 0" class="text-center py-8 text-gray-500">
                No users found
              </div>
              <div v-else class="space-y-4">
                <UserCard
                  v-for="user in users"
                  :key="user.id"
                  :user="user"
                  @edit="editUser"
                  @delete="deleteUser"
                />
              </div>
            </div>

            <!-- Create/Edit User Form -->
            <div>
              <h3 class="text-lg font-medium text-gray-900 mb-4">
                {{ editingUser ? 'Edit User' : 'Create User' }}
              </h3>
              <UserForm
                :user="editingUser"
                :is-submitting="isCreatingUser"
                @submit="handleUserSubmit"
                @cancel="cancelEdit"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GetUsersQuery } from '#graphql/client'

// Use composables
const {
  users,
  isLoading: isLoadingUsers,
  createUser,
  updateUser,
  deleteUser: removeUser,
  refresh: refreshUsers
} = useUsers()

// Form states
const isCreatingUser = ref(false)
const editingUser = ref<GetUsersQuery['users'][0] | null>(null)

// Computed
const userCount = computed(() => users.value.length)

// User handlers
const handleUserSubmit = async (data: { name: string; email: string }) => {
  isCreatingUser.value = true
  try {
    if (editingUser.value) {
      await updateUser(editingUser.value.id, data)
      editingUser.value = null
    } else {
      await createUser(data)
    }
  } catch (error) {
    console.error('Failed to save user:', error)
  } finally {
    isCreatingUser.value = false
  }
}

const editUser = (user: GetUsersQuery['users'][0]) => {
  editingUser.value = user
}

const cancelEdit = () => {
  editingUser.value = null
}

const deleteUser = async (id: string) => {
  if (confirm('Are you sure you want to delete this user?')) {
    try {
      await removeUser(id)
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }
}

// Set page title
useHead({
  title: 'Nuxt GraphQL Playground - Users',
  meta: [
    {
      name: 'description',
      content: 'User management with GraphQL and Nuxt'
    }
  ]
})
</script>