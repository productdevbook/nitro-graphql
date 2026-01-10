<script setup lang="ts">
import type { SubscriptionHandle } from 'nitro-graphql/subscribe'
import { createSubscriptionClient } from 'nitro-graphql/subscribe'
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

// Types
interface Message {
  id: string
  channelId: string
  content: string
  username: string
  createdAt: string
}

interface Channel {
  id: string
  name: string
}

// State
function getOrCreateUsername() {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('chat-username')
    if (stored)
      return stored
    const newUsername = `User${Math.floor(Math.random() * 1000)}`
    localStorage.setItem('chat-username', newUsername)
    return newUsername
  }
  return `User${Math.floor(Math.random() * 1000)}`
}
const username = ref(getOrCreateUsername())

function saveUsername() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('chat-username', username.value)
  }
}
const channels = ref<Channel[]>([])
const currentChannel = ref('general')
const messages = ref<Message[]>([])
const newMessage = ref('')
const connectionState = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
const transport = ref<'websocket' | 'sse'>('websocket')
const messagesContainer = ref<HTMLElement | null>(null)

// Subscription client
const client = createSubscriptionClient({
  wsEndpoint: '/api/graphql/ws',
  sseEndpoint: '/api/graphql',
})

let subscriptionHandle: SubscriptionHandle | null = null

// Fetch channels
async function fetchChannels() {
  const res = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ channels { id name } }' }),
  })
  const data = await res.json()
  channels.value = data.data?.channels || []
}

// Fetch messages for current channel
async function fetchMessages() {
  const res = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query($channelId: ID!) { messages(channelId: $channelId) { id channelId content username createdAt } }`,
      variables: { channelId: currentChannel.value },
    }),
  })
  const data = await res.json()
  messages.value = data.data?.messages || []
  scrollToBottom()
}

// Subscribe to messages
function subscribeToMessages() {
  if (subscriptionHandle) {
    subscriptionHandle.unsubscribe()
  }

  connectionState.value = 'connecting'

  const query = `subscription($channelId: ID!) { messageAdded(channelId: $channelId) { id channelId content username createdAt } }`

  subscriptionHandle = client.subscribe<Message>(
    query,
    { channelId: currentChannel.value },
    (message) => {
      connectionState.value = 'connected'
      messages.value.push(message)
      scrollToBottom()
    },
    (error) => {
      console.error('Subscription error:', error)
      connectionState.value = 'disconnected'
    },
    { transport: transport.value },
  )

  if (subscriptionHandle) {
    transport.value = subscriptionHandle.transport
  }
}

// Send message
async function sendMessage() {
  if (!newMessage.value.trim())
    return

  await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation($channelId: ID!, $content: String!, $username: String!) {
        sendMessage(channelId: $channelId, content: $content, username: $username) { id }
      }`,
      variables: {
        channelId: currentChannel.value,
        content: newMessage.value,
        username: username.value,
      },
    }),
  })

  newMessage.value = ''
}

// Change channel
function changeChannel(channelId: string) {
  currentChannel.value = channelId
  fetchMessages()
  subscribeToMessages()
}

// Change transport
function changeTransport(newTransport: 'websocket' | 'sse') {
  transport.value = newTransport
  subscribeToMessages()
}

// Scroll to bottom
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Format time
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString()
}

// Lifecycle
onMounted(() => {
  fetchChannels()
  fetchMessages()
  subscribeToMessages()
})

onUnmounted(() => {
  if (subscriptionHandle) {
    subscriptionHandle.unsubscribe()
  }
  client.dispose()
})
</script>

<template>
  <div class="h-screen flex flex-col bg-[#1a1a2e]">
    <!-- Header -->
    <header class="flex justify-between items-center px-8 py-4 bg-[#16213e] border-b border-[#0f3460]">
      <h1 class="text-2xl font-bold text-[#e94560]">
        GraphQL Subscriptions
      </h1>
      <div class="flex items-center gap-6">
        <a
          href="#/demo"
          class="text-gray-400 text-sm px-4 py-2 border border-[#0f3460] rounded-md hover:bg-[#0f3460] hover:text-[#e94560] transition-all"
        >
          Composable Demo →
        </a>
        <div class="flex items-center gap-2 text-sm text-gray-400">
          <span
            class="w-2.5 h-2.5 rounded-full"
            :class="{
              'bg-green-400': connectionState === 'connected',
              'bg-yellow-400': connectionState === 'connecting',
              'bg-red-400': connectionState === 'disconnected',
            }"
          />
          {{ connectionState }} ({{ transport }})
        </div>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-60 bg-[#16213e] p-4 border-r border-[#0f3460] overflow-y-auto">
        <h3 class="text-xs uppercase text-gray-500 mb-2">
          Channels
        </h3>
        <ul class="space-y-1">
          <li
            v-for="channel in channels"
            :key="channel.id"
            class="px-3 py-2 rounded cursor-pointer transition-colors"
            :class="channel.id === currentChannel
              ? 'bg-[#e94560] text-white'
              : 'text-gray-400 hover:bg-[#0f3460]'"
            @click="changeChannel(channel.id)"
          >
            # {{ channel.name }}
          </li>
        </ul>

        <h3 class="text-xs uppercase text-gray-500 mt-6 mb-2">
          Transport
        </h3>
        <div class="flex gap-2">
          <button
            class="flex-1 px-3 py-2 text-sm rounded border transition-colors"
            :class="transport === 'websocket'
              ? 'bg-[#e94560] border-[#e94560] text-white'
              : 'border-[#0f3460] text-gray-400 hover:bg-[#0f3460]'"
            @click="changeTransport('websocket')"
          >
            WebSocket
          </button>
          <button
            class="flex-1 px-3 py-2 text-sm rounded border transition-colors"
            :class="transport === 'sse'
              ? 'bg-[#e94560] border-[#e94560] text-white'
              : 'border-[#0f3460] text-gray-400 hover:bg-[#0f3460]'"
            @click="changeTransport('sse')"
          >
            SSE
          </button>
        </div>

        <h3 class="text-xs uppercase text-gray-500 mt-6 mb-2">
          Username
        </h3>
        <input
          v-model="username"
          class="w-full px-3 py-2 bg-[#0f3460] border border-[#0f3460] text-white rounded focus:outline-none focus:border-[#e94560]"
          @blur="saveUsername"
        >
      </aside>

      <!-- Chat -->
      <main class="flex-1 flex flex-col">
        <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="max-w-[70%] p-3 rounded-lg"
            :class="msg.username === username
              ? 'ml-auto bg-[#0f3460]'
              : 'bg-[#16213e]'"
          >
            <div class="flex justify-between items-center mb-1">
              <strong
                class="text-sm"
                :class="msg.username === username ? 'text-green-400' : 'text-[#e94560]'"
              >
                {{ msg.username }}
              </strong>
              <span class="text-xs text-gray-600">{{ formatTime(msg.createdAt) }}</span>
            </div>
            <div class="text-gray-300">
              {{ msg.content }}
            </div>
          </div>

          <div v-if="messages.length === 0" class="text-center text-gray-600 py-8">
            No messages yet. Start the conversation!
          </div>
        </div>

        <form
          class="flex gap-2 p-4 bg-[#16213e] border-t border-[#0f3460]"
          @submit.prevent="sendMessage"
        >
          <input
            v-model="newMessage"
            placeholder="Type a message..."
            class="flex-1 px-4 py-3 bg-[#0f3460] border border-[#0f3460] text-white rounded-lg focus:outline-none focus:border-[#e94560]"
            autofocus
          >
          <button
            type="submit"
            class="px-6 py-3 bg-[#e94560] text-white font-semibold rounded-lg hover:bg-[#d63850] transition-colors"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  </div>
</template>
