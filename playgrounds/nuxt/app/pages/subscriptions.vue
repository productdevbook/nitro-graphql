<script setup lang="ts">
// Using generated Vue composables - no boilerplate needed!
import { useCountdown, useGreetings, useServerTime } from '~/graphql/default/composables'

// All state management and cleanup is handled by composables
const {
  data: countdown,
  isActive: isCountdownActive,
  start: startCountdown,
  stop: stopCountdown,
} = useCountdown({ from: 10 })

const {
  data: greeting,
  isActive: isGreetingActive,
  start: startGreetings,
  stop: stopGreetings,
} = useGreetings()

const {
  data: serverTimeRaw,
  isActive: isTimeActive,
  start: startServerTime,
  stop: stopServerTime,
} = useServerTime()

// Format server time for display
const serverTime = computed(() =>
  serverTimeRaw.value ? new Date(serverTimeRaw.value).toLocaleTimeString() : '',
)

// onUnmounted cleanup is automatic - handled by composables!
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-8">
    <div class="max-w-4xl mx-auto px-4">
      <h1 class="text-3xl font-bold text-center mb-8">
        GraphQL Subscriptions Demo
      </h1>

      <div class="grid md:grid-cols-3 gap-6">
        <!-- Countdown Card -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-semibold mb-4">Countdown</h2>
          <div class="text-6xl font-mono text-center my-8 text-blue-600">
            {{ countdown ?? '-' }}
          </div>
          <div class="flex gap-2">
            <button
              v-if="!isCountdownActive"
              class="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              @click="startCountdown"
            >
              Start
            </button>
            <button
              v-else
              class="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              @click="stopCountdown"
            >
              Stop
            </button>
          </div>
        </div>

        <!-- Greetings Card -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-semibold mb-4">Greetings</h2>
          <div class="text-2xl text-center my-8 text-green-600 min-h-[72px] flex items-center justify-center">
            {{ greeting || 'Click Start!' }}
          </div>
          <div class="flex gap-2">
            <button
              v-if="!isGreetingActive"
              class="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              @click="startGreetings"
            >
              Start
            </button>
            <button
              v-else
              class="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              @click="stopGreetings"
            >
              Stop
            </button>
          </div>
        </div>

        <!-- Server Time Card -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-semibold mb-4">Server Time</h2>
          <div class="text-2xl font-mono text-center my-8 text-purple-600 min-h-[72px] flex items-center justify-center">
            {{ serverTime || '--:--:--' }}
          </div>
          <div class="flex gap-2">
            <button
              v-if="!isTimeActive"
              class="flex-1 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
              @click="startServerTime"
            >
              Start
            </button>
            <button
              v-else
              class="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              @click="stopServerTime"
            >
              Stop
            </button>
          </div>
        </div>
      </div>

      <div class="mt-8 text-center text-gray-600">
        <p>Using WebSocket (graphql-ws protocol) via crossws</p>
        <NuxtLink to="/" class="text-blue-500 hover:underline mt-2 inline-block">
          Back to Home
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
