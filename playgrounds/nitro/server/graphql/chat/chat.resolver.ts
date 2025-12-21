import { CHANNELS, pubsub } from './pubsub'

interface Message {
  id: string
  channel: string
  content: string
  author: string
  createdAt: string
}

interface UserEvent {
  type: 'JOINED' | 'LEFT' | 'TYPING' | 'STOPPED_TYPING'
  channel: string
  username: string
  timestamp: string
}

// Mutations
export const chatMutations = defineMutation({
  sendMessage: (_parent, { channel, content, author }: { channel: string, content: string, author: string }) => {
    const message: Message = {
      id: crypto.randomUUID(),
      channel,
      content,
      author,
      createdAt: new Date().toISOString(),
    }

    // Publish to subscribers
    pubsub.publish(CHANNELS.MESSAGE(channel), message)

    return message
  },

  joinChannel: (_parent, { channel, username }: { channel: string, username: string }) => {
    const event: UserEvent = {
      type: 'JOINED',
      channel,
      username,
      timestamp: new Date().toISOString(),
    }

    pubsub.publish(CHANNELS.USER_EVENT(channel), event)
    return event
  },

  leaveChannel: (_parent, { channel, username }: { channel: string, username: string }) => {
    const event: UserEvent = {
      type: 'LEFT',
      channel,
      username,
      timestamp: new Date().toISOString(),
    }

    pubsub.publish(CHANNELS.USER_EVENT(channel), event)
    return event
  },

  startTyping: (_parent, { channel, username }: { channel: string, username: string }) => {
    const event: UserEvent = {
      type: 'TYPING',
      channel,
      username,
      timestamp: new Date().toISOString(),
    }

    pubsub.publish(CHANNELS.USER_EVENT(channel), event)
    return event
  },

  stopTyping: (_parent, { channel, username }: { channel: string, username: string }) => {
    const event: UserEvent = {
      type: 'STOPPED_TYPING',
      channel,
      username,
      timestamp: new Date().toISOString(),
    }

    pubsub.publish(CHANNELS.USER_EVENT(channel), event)
    return event
  },
})

// Subscriptions
export const chatSubscriptions = defineSubscription({
  onMessage: {
    subscribe: (_parent, { channel }: { channel: string }) => {
      return {
        [Symbol.asyncIterator]: () => pubsub.asyncIterator<Message>(CHANNELS.MESSAGE(channel)),
      }
    },
    resolve: (payload: Message) => payload,
  },

  onUserEvent: {
    subscribe: (_parent, { channel }: { channel: string }) => {
      return {
        [Symbol.asyncIterator]: () => pubsub.asyncIterator<UserEvent>(CHANNELS.USER_EVENT(channel)),
      }
    },
    resolve: (payload: UserEvent) => payload,
  },
})
