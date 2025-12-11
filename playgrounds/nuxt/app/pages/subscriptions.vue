<script setup lang="ts">
// Using generated Vue composables from sdk.ts - no boilerplate needed!
// Now with unified transport support: WebSocket, SSE, or Auto mode
import { useCountdown, useGreetings, useServerTime } from '~/graphql/default/sdk'

// === WebSocket Subscriptions (default) ===
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

// === SSE Transport ===
// Same composable API, just add { sse: true } option!
const {
  data: sseCountdown,
  isActive: isSseActive,
  transport: sseTransport,
  start: startSseCountdown,
  stop: stopSseCountdown,
} = useCountdown({ from: 10 }, { sse: true })

// === Auto Mode ===
// WebSocket first, automatic SSE fallback if WS fails
const {
  data: autoCountdown,
  isActive: isAutoActive,
  transport: autoTransport,
  start: startAutoCountdown,
  stop: stopAutoCountdown,
} = useCountdown({ from: 10 }, { transport: 'auto' })
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-8">
    <div class="max-w-4xl mx-auto px-4">
      <h1 class="text-3xl font-bold text-center mb-8">
        GraphQL Subscriptions Demo
      </h1>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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

        <!-- SSE Transport Card -->
        <div class="bg-white rounded-lg shadow-lg p-6 border-2 border-dashed border-orange-300">
          <h2 class="text-xl font-semibold mb-4">
            SSE Countdown
            <span class="text-xs text-orange-500 block">{ sse: true }</span>
          </h2>
          <div class="text-6xl font-mono text-center my-8 text-orange-600">
            {{ sseCountdown ?? '-' }}
          </div>
          <div class="flex gap-2">
            <button
              v-if="!isSseActive"
              class="flex-1 bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
              @click="startSseCountdown"
            >
              Start
            </button>
            <button
              v-else
              class="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              @click="stopSseCountdown"
            >
              Stop
            </button>
          </div>
        </div>

        <!-- Auto Mode Card -->
        <div class="bg-white rounded-lg shadow-lg p-6 border-2 border-dashed border-teal-300">
          <h2 class="text-xl font-semibold mb-4">
            Auto Mode
            <span class="text-xs text-teal-500 block">{{ autoTransport }} active</span>
          </h2>
          <div class="text-6xl font-mono text-center my-8 text-teal-600">
            {{ autoCountdown ?? '-' }}
          </div>
          <div class="flex gap-2">
            <button
              v-if="!isAutoActive"
              class="flex-1 bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600"
              @click="startAutoCountdown"
            >
              Start
            </button>
            <button
              v-else
              class="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              @click="stopAutoCountdown"
            >
              Stop
            </button>
          </div>
        </div>
      </div>

      <div class="mt-8 text-center text-gray-600">
        <p>First 3 cards use <strong>WebSocket</strong> (default)</p>
        <p class="text-orange-600">4th card uses <strong>SSE</strong> with <code class="bg-gray-200 px-1 rounded">{ sse: true }</code></p>
        <p class="text-teal-600">5th card uses <strong>Auto</strong> - WS first, SSE fallback</p>
        <NuxtLink to="/" class="text-blue-500 hover:underline mt-2 inline-block">
          Back to Home
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
