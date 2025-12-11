<script setup lang="ts">
// All imports from sdk.ts - no separate composables.ts needed!
import {
  useCountdown,
  useGreetings,
  useServerTime,
  useSubscriptionSession,
} from '~/graphql/default/sdk'

// Method 1: Using useSubscriptionSession hook (multiplexing)
const { session, isConnected, state, subscriptionCount, close } = useSubscriptionSession()

// All composables share the same session (1 WebSocket connection)
const { data: countdown, isActive: isCountdownActive, start: startCountdown, stop: stopCountdown } =
  useCountdown({ from: 10 }, { session })

const { data: greeting, isActive: isGreetingActive, start: startGreetings, stop: stopGreetings } =
  useGreetings({ session })

const { data: serverTimeRaw, isActive: isTimeActive, start: startServerTime, stop: stopServerTime } =
  useServerTime({ session })

const serverTime = computed(() =>
  serverTimeRaw.value ? new Date(serverTimeRaw.value).toLocaleTimeString() : '',
)

function startAll() {
  startCountdown()
  startGreetings()
  startServerTime()
}

function stopAll() {
  stopCountdown()
  stopGreetings()
  stopServerTime()
}

// Session auto-closes on unmount via useSubscriptionSession hook
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <h1 class="text-3xl font-bold mb-2">Session-Based Multiplexing</h1>
    <p class="text-gray-400 mb-6">
      All composables share one WebSocket via <code
        class="bg-gray-800 px-2 py-1 rounded">useSubscriptionSession()</code>
    </p>

    <!-- Session Status -->
    <div class="bg-blue-900 p-4 rounded-lg mb-6 flex justify-between items-center">
      <div>
        <span class="text-gray-300">Connection:</span>
        <span :class="isConnected ? 'text-green-400' : 'text-red-400'" class="font-bold ml-2">
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </span>
      </div>
      <div>
        <span class="text-gray-300">State:</span>
        <span class="font-mono ml-2">{{ state }}</span>
      </div>
      <div>
        <span class="text-gray-300">Subscriptions:</span>
        <span class="text-2xl font-bold text-yellow-400 ml-2">{{ subscriptionCount }}</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex gap-3 mb-6">
      <button @click="startAll" class="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-semibold">
        Start All 3
      </button>
      <button @click="stopAll" class="bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-semibold">
        Stop All
      </button>
    </div>

    <!-- Subscription Cards -->
    <div class="grid md:grid-cols-3 gap-6">
      <div class="bg-white rounded-lg shadow-lg p-6 text-gray-900">
        <h2 class="text-xl font-semibold mb-4">Countdown</h2>
        <div class="text-6xl font-mono text-center my-8 text-blue-600">
          {{ countdown ?? '-' }}
        </div>
        <button v-if="!isCountdownActive" class="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          @click="startCountdown">Start</button>
        <button v-else class="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          @click="stopCountdown">Stop</button>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-6 text-gray-900">
        <h2 class="text-xl font-semibold mb-4">Greetings</h2>
        <div class="text-2xl text-center my-8 text-green-600 min-h-[72px] flex items-center justify-center">
          {{ greeting || 'Waiting...' }}
        </div>
        <button v-if="!isGreetingActive" class="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          @click="startGreetings">Start</button>
        <button v-else class="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          @click="stopGreetings">Stop</button>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-6 text-gray-900">
        <h2 class="text-xl font-semibold mb-4">Server Time</h2>
        <div class="text-2xl font-mono text-center my-8 text-purple-600 min-h-[72px] flex items-center justify-center">
          {{ serverTime || '--:--:--' }}
        </div>
        <button v-if="!isTimeActive" class="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          @click="startServerTime">Start</button>
        <button v-else class="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          @click="stopServerTime">Stop</button>
      </div>
    </div>

    <!-- Code Example -->
    <div class="mt-8 bg-gray-800 p-4 rounded-lg">
      <h3 class="text-lg font-semibold mb-2">New API (from sdk.ts):</h3>
      <pre class="text-sm text-gray-300 overflow-x-auto"><code>import { useCountdown, useSubscriptionSession } from '~/graphql/default/sdk'

// Create shared session
const { session, isConnected, subscriptionCount } = useSubscriptionSession()

// All composables share 1 WebSocket
const { data: count } = useCountdown({ from: 10 }, { session })
const { data: time } = useServerTime({ session })

// With callbacks
const { data } = useCountdown({ from: 10 }, {
  session,
  immediate: true,
  onStart: () => console.log('Started'),
  onData: (count) => console.log('Count:', count),
  onError: (err) => toast.error(err.message),
})</code></pre>
    </div>

    <div class="mt-6 text-center text-gray-400">
      <p>Open DevTools > Network > WS to verify only 1 connection!</p>
      <NuxtLink to="/subscriptions" class="text-blue-400 hover:underline mt-2 inline-block">
        Back to subscriptions page
      </NuxtLink>
    </div>
  </div>
</template>
