/**
 * Chat resolvers with GraphQL Subscriptions example
 *
 * This demonstrates how to use the built-in PubSub for real-time messaging.
 */

import {
  createPubSub,
  defineMutation,
  defineQuery,
  defineSubscription,
  withFilter,
} from 'nitro-graphql/define'

// Define topic types for type-safe PubSub
interface ChatTopics {
  'message:added': Message
  'channel:created': Channel
}

// Create typed PubSub instance
const pubsub = createPubSub<ChatTopics>()

// In-memory data store (replace with database in production)
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
  createdAt: string
}

const channels: Map<string, Channel> = new Map([
  ['general', { id: 'general', name: 'General', createdAt: new Date().toISOString() }],
  ['random', { id: 'random', name: 'Random', createdAt: new Date().toISOString() }],
])

const messages: Map<string, Message[]> = new Map([
  ['general', []],
  ['random', []],
])

// Query resolvers
export const chatQueries = defineQuery({
  messages: (_, { channelId }) => {
    return messages.get(channelId) || []
  },

  channels: () => {
    return Array.from(channels.values())
  },
})

// Mutation resolvers
export const chatMutations = defineMutation({
  sendMessage: async (_, { channelId, content, username }) => {
    const message: Message = {
      id: crypto.randomUUID(),
      channelId,
      content,
      username,
      createdAt: new Date().toISOString(),
    }

    // Store message
    const channelMessages = messages.get(channelId) || []
    channelMessages.push(message)
    messages.set(channelId, channelMessages)

    // Publish to subscribers
    await pubsub.publish('message:added', message)

    return message
  },

  createChannel: async (_, { name }) => {
    const channel: Channel = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      createdAt: new Date().toISOString(),
    }

    channels.set(channel.id, channel)
    messages.set(channel.id, [])

    await pubsub.publish('channel:created', channel)

    return channel
  },
})

// Subscription resolvers
export const chatSubscriptions = defineSubscription({
  // Subscribe to messages in a specific channel
  messageAdded: {
    async* subscribe(_, { channelId }) {
      // Filter messages by channel
      yield* withFilter(
        pubsub.subscribe('message:added'),
        message => message.channelId === channelId,
      )
    },
    resolve: (message: Message) => message,
  },

  // Subscribe to all messages across all channels
  allMessages: {
    async* subscribe() {
      yield* pubsub.subscribe('message:added')
    },
    resolve: (message: Message) => message,
  },
})
