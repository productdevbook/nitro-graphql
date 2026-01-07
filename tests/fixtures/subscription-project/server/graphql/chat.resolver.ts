import {
  createPubSub,
  defineMutation,
  defineQuery,
  defineSubscription,
} from 'nitro-graphql/define'

interface Topics {
  'message:added': Message
}

interface Message {
  id: string
  content: string
  createdAt: string
}

const pubsub = createPubSub<Topics>()
const messages: Message[] = []

export const chatQueries = defineQuery({
  messages: () => messages,
})

export const chatMutations = defineMutation({
  sendMessage: async (_, { content }) => {
    const message: Message = {
      id: String(messages.length + 1),
      content,
      createdAt: new Date().toISOString(),
    }
    messages.push(message)
    await pubsub.publish('message:added', message)
    return message
  },
})

export const chatSubscriptions = defineSubscription({
  messageAdded: {
    async* subscribe() {
      yield* pubsub.subscribe('message:added')
    },
    resolve: (message: Message) => message,
  },

  countdown: {
    async* subscribe(_, { from }) {
      for (let i = from; i >= 0; i--) {
        yield i
        await new Promise(r => setTimeout(r, 100))
      }
    },
    resolve: (value: number) => value,
  },
})
