<script setup lang="ts">
import { ref } from 'vue'
import { useUser } from '../graphql'

// Reactive user ID for testing different scenarios
const userId = ref('1')

// Use the composable with union type error handling
const {
  userResult,
  user,
  isLoading,
  error,
  isSuccess,
  isNotFound,
  isUnauthorized,
  // isErrorResult,
  errorMessage,
  refetch,
} = useUser(userId)

// Test scenarios
const testCases = [
  { id: '1', label: 'Valid User (ID: 1)', description: 'Returns User type' },
  { id: '2', label: 'Valid User (ID: 2)', description: 'Returns User type' },
  { id: '999', label: 'Non-existent User', description: 'Returns UserNotFoundError' },
  { id: 'forbidden', label: 'Forbidden User', description: 'Returns UnauthorizedError' },
]

function testUserId(id: string) {
  userId.value = id
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 p-8">
    <div class="max-w-4xl mx-auto space-y-8">
      <!-- Header -->
      <div>
        <router-link
          to="/"
          class="text-blue-400 hover:text-blue-300 transition-colors"
        >
          ← Back to Home
        </router-link>
      </div>

      <div>
        <h1 class="text-4xl font-bold text-white mb-2">
          Union Type Error Handling Demo
        </h1>
        <p class="text-gray-400">
          GraphQL "Errors as Data" pattern - Fixing the null ambiguity problem
        </p>
      </div>

      <!-- Test Controls -->
      <div class="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
        <h2 class="text-xl font-semibold text-white mb-4">
          Test Different Scenarios
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            v-for="testCase in testCases"
            :key="testCase.id"
            @click="testUserId(testCase.id)"
            :class="[
              'p-4 rounded-lg border-2 text-left transition-all',
              userId === testCase.id
                ? 'border-blue-500 bg-blue-900/30'
                : 'border-gray-600 bg-gray-900/30 hover:border-gray-500'
            ]"
          >
            <div class="font-semibold text-white">{{ testCase.label }}</div>
            <div class="text-sm text-gray-400 mt-1">{{ testCase.description }}</div>
          </button>
        </div>
      </div>

      <!-- Result Display -->
      <div class="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-white">
            Query Result
          </h2>
          <button
            @click="refetch()"
            :disabled="isLoading"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm font-medium rounded transition-colors duration-200"
          >
            {{ isLoading ? 'Loading...' : 'Refetch' }}
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-gray-400 py-8">
          <div class="flex items-center justify-center gap-2">
            <div class="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span>Loading user data...</span>
          </div>
        </div>

        <!-- System Error (Network, Server Crash, etc.) -->
        <div v-else-if="error" class="text-red-400 p-4 bg-red-900/20 rounded-lg">
          <div class="font-semibold mb-2">System Error</div>
          <div>{{ error.message }}</div>
          <div class="text-sm text-gray-400 mt-2">
            (This is an unexpected error, not a business logic error)
          </div>
        </div>

        <!-- Union Type Results -->
        <div v-else-if="userResult" class="space-y-4">
          <!-- Type Badge -->
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-400">Result Type:</span>
            <span
              :class="[
                'px-3 py-1 rounded-full text-sm font-mono font-semibold',
                isSuccess ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
              ]"
            >
              {{ userResult.__typename }}
            </span>
          </div>

          <!-- SUCCESS: User Type -->
          <div v-if="isSuccess" class="p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-2xl">✅</span>
              <h3 class="text-lg font-semibold text-green-300">Success</h3>
            </div>
            <div class="space-y-2 text-gray-300">
              <p><span class="text-gray-400">ID:</span> <span class="font-mono">{{ user?.id }}</span></p>
              <p><span class="text-gray-400">Name:</span> {{ user?.name }}</p>
              <p><span class="text-gray-400">Email:</span> {{ user?.email }}</p>
              <p><span class="text-gray-400">Created:</span> {{ user?.createdAt }}</p>
            </div>
          </div>

          <!-- ERROR: User Not Found -->
          <div v-else-if="isNotFound" class="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-2xl">🔍</span>
              <h3 class="text-lg font-semibold text-yellow-300">User Not Found</h3>
            </div>
            <div class="space-y-2 text-gray-300">
              <p><span class="text-gray-400">Message:</span> {{ errorMessage }}</p>
              <p v-if="userResult.__typename === 'UserNotFoundError'">
                <span class="text-gray-400">User ID:</span>
                <span class="font-mono">{{ userResult.userId }}</span>
              </p>
            </div>
            <div class="mt-4 text-sm text-gray-400">
              💡 This is a valid business scenario - the user doesn't exist
            </div>
          </div>

          <!-- ERROR: Unauthorized -->
          <div v-else-if="isUnauthorized" class="p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-2xl">🚫</span>
              <h3 class="text-lg font-semibold text-red-300">Unauthorized Access</h3>
            </div>
            <div class="space-y-2 text-gray-300">
              <p><span class="text-gray-400">Message:</span> {{ errorMessage }}</p>
              <p v-if="userResult.__typename === 'UnauthorizedError'">
                <span class="text-gray-400">Required Permission:</span>
                <span class="font-mono">{{ userResult.requiredPermission }}</span>
              </p>
            </div>
            <div class="mt-4">
              <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded">
                Request Access
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pattern Explanation -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Traditional Approach -->
        <div class="p-6 bg-red-900/10 border border-red-700/50 rounded-lg">
          <h3 class="text-lg font-semibold text-red-300 mb-3">
            ❌ Traditional Approach Problems
          </h3>
          <ul class="text-gray-300 space-y-2 text-sm">
            <li>• <strong>Null Ambiguity:</strong> user === null - Why?</li>
            <li>• <strong>No Type Safety:</strong> Untyped error messages</li>
            <li>• <strong>Null Propagation:</strong> Errors destroy parent data</li>
            <li>• <strong>Out-of-Band Errors:</strong> errors array is separate</li>
            <li>• <strong>Complex Handling:</strong> Check both data and errors</li>
          </ul>
        </div>

        <!-- Union Type Approach -->
        <div class="p-6 bg-green-900/10 border border-green-700/50 rounded-lg">
          <h3 class="text-lg font-semibold text-green-300 mb-3">
            ✅ Union Type Advantages
          </h3>
          <ul class="text-gray-300 space-y-2 text-sm">
            <li>• <strong>Explicit Types:</strong> __typename tells you exactly what happened</li>
            <li>• <strong>Type Safety:</strong> Structured, schema-validated errors</li>
            <li>• <strong>No Null Ambiguity:</strong> Clear success vs error states</li>
            <li>• <strong>Better UX:</strong> Error-specific UI and actions</li>
            <li>• <strong>Self-Documenting:</strong> Schema shows all possible outcomes</li>
          </ul>
        </div>
      </div>

      <!-- Code Example -->
      <div class="p-6 bg-gray-900/50 border border-gray-700 rounded-lg">
        <h3 class="text-lg font-semibold text-blue-300 mb-3">
          📝 Pattern Summary
        </h3>
        <div class="bg-black/50 p-4 rounded font-mono text-sm overflow-x-auto">
          <pre class="text-gray-300"><span class="text-purple-400">union</span> <span class="text-yellow-300">UserResult</span> = <span class="text-green-300">User</span> | <span class="text-red-300">UserNotFoundError</span> | <span class="text-red-300">UnauthorizedError</span>

<span class="text-purple-400">type</span> <span class="text-yellow-300">Query</span> {
  getUser(id: ID!): <span class="text-yellow-300">UserResult!</span>  <span class="text-gray-500">// Always returns something</span>
}

<span class="text-gray-500">// Client handling with __typename</span>
<span class="text-purple-400">if</span> (result.__typename === <span class="text-green-400">'User'</span>) {
  <span class="text-gray-500">// TypeScript knows: result.name, result.email available</span>
} <span class="text-purple-400">else if</span> (result.__typename === <span class="text-green-400">'UserNotFoundError'</span>) {
  <span class="text-gray-500">// TypeScript knows: result.userId available</span>
}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
