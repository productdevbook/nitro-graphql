import {
  createPubSub,
  defineMutation,
  defineQuery,
  defineSubscription,
} from 'nitro-graphql/define'

interface Message {
  id: string
  text: string
  author: string
  createdAt: string
}

const pubsub = createPubSub<{
  MESSAGE: Message
  ONLINE: number
}>()

const messages: Message[] = []
let onlineCount = 1

export const chatQueries = defineQuery({
  messages: () => messages,
  onlineCount: () => onlineCount,
})

export const chatMutations = defineMutation({
  sendMessage: async (_, { text, author }: { text: string, author: string }) => {
    const message: Message = {
      id: crypto.randomUUID(),
      text,
      author,
      createdAt: new Date().toISOString(),
    }
    messages.push(message)
    await pubsub.publish('MESSAGE', message)
    return message
  },
})

export const chatSubscriptions = defineSubscription({
  messageReceived: {
    subscribe: () => pubsub.subscribe('MESSAGE'),
    resolve: (payload: Message) => payload,
  },
  onlineCountChanged: {
    subscribe: () => pubsub.subscribe('ONLINE'),
    resolve: (payload: number) => payload,
  },
})

// Simulate online count changes
setInterval(() => {
  onlineCount = Math.floor(Math.random() * 50) + 1
  pubsub.publish('ONLINE', onlineCount)
}, 10000)
