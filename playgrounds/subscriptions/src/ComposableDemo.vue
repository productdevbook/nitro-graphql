<script setup lang="ts">
/**
 * Composable Demo - Auto-generated Vue composables usage
 */
import { ref } from 'vue'
import {
  subscription,
  useAllMessages,
  useMessageAdded,
  useSubscriptionSession,
} from './graphql/default/sdk'

// ============================================
// Example 1: Basic Composable Usage
// ============================================
const channelId = ref('general')

const {
  data: lastMessage,
  error,
  isActive,
  transport,
  start,
  stop,
  restart,
} = useMessageAdded(
  { channelId: channelId.value },
  {
    immediate: false,
    onData: _msg => {},
    onError: err => console.error('Error:', err),
  },
)

// ============================================
// Example 2: Listen to All Messages
// ============================================
const allMessagesLog = ref<string[]>([])

const {
  data: _latestFromAll,
  isActive: allActive,
  start: startAll,
  stop: stopAll,
} = useAllMessages({
  immediate: false,
  onData: (msg) => {
    allMessagesLog.value.push(`[${msg.channelId}] ${msg.username}: ${msg.content}`)
    if (allMessagesLog.value.length > 10) {
      allMessagesLog.value.shift()
    }
  },
})

// ============================================
// Example 3: Session Multiplexing
// ============================================
const session = useSubscriptionSession()
const sessionMessages = ref<string[]>([])

function subscribeViaSession() {
  session.subscribe(
    `subscription { allMessages { id username content channelId } }`,
    {},
    (msg: any) => {
      sessionMessages.value.push(`${msg.username}: ${msg.content}`)
      if (sessionMessages.value.length > 5)
        sessionMessages.value.shift()
    },
  )
}

// ============================================
// Example 4: Drizzle-style API
// ============================================
const drizzleMessages = ref<string[]>([])
let drizzleHandle: ReturnType<typeof subscription.AllMessages>['start'] extends () => infer R ? R : never

function startDrizzle() {
  drizzleHandle = subscription.AllMessages()
    .onData((msg) => {
      drizzleMessages.value.push(`${msg.username}: ${msg.content}`)
      if (drizzleMessages.value.length > 5)
        drizzleMessages.value.shift()
    })
    .onError(err => console.error('Drizzle error:', err))
    .start()
}

function stopDrizzle() {
  drizzleHandle?.unsubscribe()
}
</script>

<template>
  <div class="min-h-screen bg-[#1a1a2e] p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold text-[#e94560] mb-2">
        Vue Composables Demo
      </h1>
      <p class="text-gray-500 mb-8">
        Auto-generated subscription composables
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Example 1: useMessageAdded -->
        <section class="bg-[#16213e] rounded-xl p-6 border border-[#0f3460]">
          <h2 class="text-lg font-semibold text-white mb-1">
            1. useMessageAdded
          </h2>
          <p class="text-gray-500 text-sm mb-4">
            Listen to messages in a specific channel
          </p>

          <div class="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <span
              class="w-2 h-2 rounded-full"
              :class="isActive ? 'bg-green-400' : 'bg-gray-600'"
            />
            {{ isActive ? 'Active' : 'Inactive' }}
            <span class="text-gray-600">({{ transport }})</span>
          </div>

          <div class="flex gap-2 mb-4">
            <button
              :disabled="isActive"
              class="px-4 py-2 text-sm rounded border transition-colors"
              :class="isActive
                ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                : 'border-[#0f3460] text-white hover:bg-[#0f3460]'"
              @click="start"
            >
              Start
            </button>
            <button
              :disabled="!isActive"
              class="px-4 py-2 text-sm rounded border transition-colors"
              :class="!isActive
                ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                : 'border-[#0f3460] text-white hover:bg-[#0f3460]'"
              @click="stop"
            >
              Stop
            </button>
            <button
              class="px-4 py-2 text-sm rounded border border-[#0f3460] text-white hover:bg-[#0f3460] transition-colors"
              @click="restart"
            >
              Restart
            </button>
          </div>

          <div class="bg-[#0f3460] rounded-lg p-4">
            <span class="block text-xs uppercase text-gray-500 mb-2">Last message</span>
            <pre v-if="lastMessage" class="text-green-400 text-sm whitespace-pre-wrap break-all">{{ lastMessage }}</pre>
            <span v-else class="text-gray-600 italic text-sm">No messages yet</span>
          </div>

          <div v-if="error" class="mt-4 p-3 bg-red-900/30 rounded-lg text-red-400 text-sm">
            {{ error.message }}
          </div>
        </section>

        <!-- Example 2: useAllMessages -->
        <section class="bg-[#16213e] rounded-xl p-6 border border-[#0f3460]">
          <h2 class="text-lg font-semibold text-white mb-1">
            2. useAllMessages
          </h2>
          <p class="text-gray-500 text-sm mb-4">
            Listen to messages from all channels
          </p>

          <div class="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <span
              class="w-2 h-2 rounded-full"
              :class="allActive ? 'bg-green-400' : 'bg-gray-600'"
            />
            {{ allActive ? 'Active' : 'Inactive' }}
          </div>

          <div class="flex gap-2 mb-4">
            <button
              :disabled="allActive"
              class="px-4 py-2 text-sm rounded border transition-colors"
              :class="allActive
                ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                : 'border-[#0f3460] text-white hover:bg-[#0f3460]'"
              @click="startAll"
            >
              Start
            </button>
            <button
              :disabled="!allActive"
              class="px-4 py-2 text-sm rounded border transition-colors"
              :class="!allActive
                ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                : 'border-[#0f3460] text-white hover:bg-[#0f3460]'"
              @click="stopAll"
            >
              Stop
            </button>
          </div>

          <div class="bg-[#0f3460] rounded-lg p-4">
            <span class="block text-xs uppercase text-gray-500 mb-2">Message log (last 10)</span>
            <ul v-if="allMessagesLog.length" class="space-y-1">
              <li
                v-for="(msg, i) in allMessagesLog"
                :key="i"
                class="text-gray-300 text-sm py-1 border-b border-[#1a4a7a] last:border-0"
              >
                {{ msg }}
              </li>
            </ul>
            <span v-else class="text-gray-600 italic text-sm">No messages yet</span>
          </div>
        </section>

        <!-- Example 3: useSubscriptionSession -->
        <section class="bg-[#16213e] rounded-xl p-6 border border-[#0f3460]">
          <h2 class="text-lg font-semibold text-white mb-1">
            3. useSubscriptionSession
          </h2>
          <p class="text-gray-500 text-sm mb-4">
            Multiplexed session (single connection, multiple subscriptions)
          </p>

          <div class="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <span
              class="w-2 h-2 rounded-full"
              :class="session.isConnected.value ? 'bg-green-400' : 'bg-gray-600'"
            />
            {{ session.state.value }}
            <span class="text-gray-600">({{ session.subscriptionCount.value }} subs)</span>
          </div>

          <div class="flex gap-2 mb-4">
            <button
              class="px-4 py-2 text-sm rounded border border-[#0f3460] text-white hover:bg-[#0f3460] transition-colors"
              @click="subscribeViaSession"
            >
              Add Subscription
            </button>
            <button
              class="px-4 py-2 text-sm rounded border border-[#0f3460] text-white hover:bg-[#0f3460] transition-colors"
              @click="session.close()"
            >
              Close All
            </button>
          </div>

          <div class="bg-[#0f3460] rounded-lg p-4">
            <span class="block text-xs uppercase text-gray-500 mb-2">Session messages</span>
            <ul v-if="sessionMessages.length" class="space-y-1">
              <li
                v-for="(msg, i) in sessionMessages"
                :key="i"
                class="text-gray-300 text-sm py-1 border-b border-[#1a4a7a] last:border-0"
              >
                {{ msg }}
              </li>
            </ul>
            <span v-else class="text-gray-600 italic text-sm">No messages yet</span>
          </div>
        </section>

        <!-- Example 4: Drizzle-style -->
        <section class="bg-[#16213e] rounded-xl p-6 border border-[#0f3460]">
          <h2 class="text-lg font-semibold text-white mb-1">
            4. Drizzle-style API
          </h2>
          <p class="text-gray-500 text-sm mb-4">
            subscription.AllMessages().onData(fn).start()
          </p>

          <div class="flex gap-2 mb-4">
            <button
              class="px-4 py-2 text-sm rounded border border-[#0f3460] text-white hover:bg-[#0f3460] transition-colors"
              @click="startDrizzle"
            >
              Start
            </button>
            <button
              class="px-4 py-2 text-sm rounded border border-[#0f3460] text-white hover:bg-[#0f3460] transition-colors"
              @click="stopDrizzle"
            >
              Stop
            </button>
          </div>

          <div class="bg-[#0f3460] rounded-lg p-4 mb-4">
            <span class="block text-xs uppercase text-gray-500 mb-2">Drizzle messages</span>
            <ul v-if="drizzleMessages.length" class="space-y-1">
              <li
                v-for="(msg, i) in drizzleMessages"
                :key="i"
                class="text-gray-300 text-sm py-1 border-b border-[#1a4a7a] last:border-0"
              >
                {{ msg }}
              </li>
            </ul>
            <span v-else class="text-gray-600 italic text-sm">No messages yet</span>
          </div>

          <pre class="bg-[#0a1628] rounded-lg p-3 text-xs text-gray-500 overflow-x-auto">subscription.AllMessages()
  .onData(msg => console.log(msg))
  .onError(err => console.error(err))
  .start()</pre>
        </section>
      </div>

      <div class="mt-8 text-center">
        <a href="#/" class="text-[#e94560] hover:underline">← Back to Chat</a>
      </div>
    </div>
  </div>
</template>
