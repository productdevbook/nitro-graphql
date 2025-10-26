# Real-Time Data with Subscriptions

Complete guide to implementing GraphQL subscriptions for real-time data updates in Nitro GraphQL.

## Overview

This recipe covers:
- GraphQL subscriptions with GraphQL Yoga
- WebSocket setup and configuration
- PubSub patterns with Redis
- Real-time notifications
- Live updates for collaborative features
- Client-side subscription handling

## GraphQL Yoga Subscriptions

GraphQL Yoga has built-in support for subscriptions via Server-Sent Events (SSE) and WebSockets.

### 1. Define Subscription Schema

Create `server/graphql/subscriptions/subscriptions.graphql`:

```graphql
type Subscription {
  """Subscribe to new posts"""
  postCreated: Post!

  """Subscribe to post updates"""
  postUpdated(id: ID!): Post!

  """Subscribe to comments on a post"""
  commentAdded(postId: ID!): Comment!

  """Subscribe to notifications for current user"""
  notificationReceived: Notification! @auth

  """Subscribe to typing indicators in a chat"""
  userTyping(chatId: ID!): TypingEvent!

  """Subscribe to live counter updates"""
  counterUpdated: Int!
}

type Comment {
  id: ID!
  content: String!
  postId: ID!
  post: Post!
  author: User!
  createdAt: DateTime!
}

type Notification {
  id: ID!
  type: NotificationType!
  message: String!
  data: JSON
  read: Boolean!
  createdAt: DateTime!
}

enum NotificationType {
  POST_LIKED
  POST_COMMENTED
  USER_FOLLOWED
  SYSTEM
}

type TypingEvent {
  userId: ID!
  username: String!
  chatId: ID!
  isTyping: Boolean!
}
```

### 2. Create PubSub Instance

Create `server/utils/pubsub.ts`:

```typescript
import { createPubSub } from '@graphql-yoga/subscription'

// In-memory PubSub for development
export const pubsub = createPubSub()

// Topic names
export const TOPICS = {
  POST_CREATED: 'POST_CREATED',
  POST_UPDATED: 'POST_UPDATED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  NOTIFICATION_RECEIVED: 'NOTIFICATION_RECEIVED',
  USER_TYPING: 'USER_TYPING',
  COUNTER_UPDATED: 'COUNTER_UPDATED',
} as const

export type TopicName = typeof TOPICS[keyof typeof TOPICS]
```

### 3. Create Subscription Resolvers

Create `server/graphql/subscriptions/subscriptions.resolver.ts`:

```typescript
import { GraphQLError } from 'graphql'
import { pubsub, TOPICS } from '../../utils/pubsub'

export const subscriptionResolvers = defineResolver({
  Subscription: {
    postCreated: {
      subscribe: () => pubsub.subscribe(TOPICS.POST_CREATED),
      resolve: payload => payload,
    },

    postUpdated: {
      subscribe: (_parent, { id }) => {
        // Subscribe to specific post updates
        return pubsub.subscribe(`${TOPICS.POST_UPDATED}:${id}`)
      },
      resolve: payload => payload,
    },

    commentAdded: {
      subscribe: (_parent, { postId }) => {
        return pubsub.subscribe(`${TOPICS.COMMENT_ADDED}:${postId}`)
      },
      resolve: payload => payload,
    },

    notificationReceived: {
      subscribe: (_parent, _args, context) => {
        if (!context.user) {
          throw new GraphQLError('Authentication required', {
            extensions: { code: 'UNAUTHENTICATED' },
          })
        }

        // Subscribe to user-specific notifications
        return pubsub.subscribe(`${TOPICS.NOTIFICATION_RECEIVED}:${context.user.id}`)
      },
      resolve: payload => payload,
    },

    userTyping: {
      subscribe: (_parent, { chatId }) => {
        return pubsub.subscribe(`${TOPICS.USER_TYPING}:${chatId}`)
      },
      resolve: payload => payload,
    },

    counterUpdated: {
      subscribe: () => pubsub.subscribe(TOPICS.COUNTER_UPDATED),
      resolve: payload => payload.count,
    },
  },
})
```

### 4. Publish Events from Mutations

Update mutation resolvers to publish events:

```typescript
import { pubsub, TOPICS } from '../../utils/pubsub'

export const postMutations = defineResolver({
  Mutation: {
    createPost: async (_parent, { input }, context) => {
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const post = await context.db.post.create({
        data: {
          ...input,
          authorId: context.user.id,
        },
        include: {
          author: true,
        },
      })

      // Publish event for subscribers
      await pubsub.publish(TOPICS.POST_CREATED, post)

      return post
    },

    updatePost: async (_parent, { id, input }, context) => {
      const post = await context.db.post.update({
        where: { id },
        data: input,
        include: {
          author: true,
        },
      })

      // Publish to post-specific topic
      await pubsub.publish(`${TOPICS.POST_UPDATED}:${id}`, post)

      return post
    },

    addComment: async (_parent, { input }, context) => {
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const comment = await context.db.comment.create({
        data: {
          content: input.content,
          postId: input.postId,
          authorId: context.user.id,
        },
        include: {
          author: true,
          post: true,
        },
      })

      // Publish comment to post subscribers
      await pubsub.publish(`${TOPICS.COMMENT_ADDED}:${input.postId}`, comment)

      // Notify post author
      const post = await context.db.post.findUnique({
        where: { id: input.postId },
      })

      if (post && post.authorId !== context.user.id) {
        await pubsub.publish(
          `${TOPICS.NOTIFICATION_RECEIVED}:${post.authorId}`,
          {
            id: crypto.randomUUID(),
            type: 'POST_COMMENTED',
            message: `${context.user.name} commented on your post`,
            data: { commentId: comment.id, postId: input.postId },
            read: false,
            createdAt: new Date(),
          }
        )
      }

      return comment
    },
  },
})
```

## Redis PubSub for Production

For production environments with multiple servers, use Redis PubSub:

### 1. Install Redis PubSub

```bash
pnpm add @graphql-yoga/redis-event-target ioredis
```

### 2. Configure Redis PubSub

Update `server/utils/pubsub.ts`:

```typescript
import { createRedisEventTarget } from '@graphql-yoga/redis-event-target'
import { createPubSub } from '@graphql-yoga/subscription'
import Redis from 'ioredis'

const publishClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
})

const subscribeClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
})

const eventTarget = createRedisEventTarget({
  publishClient,
  subscribeClient,
})

export const pubsub = createPubSub({ eventTarget })

// Rest of the code...
```

## Client-Side Subscription Handling

### 1. Define Subscription Queries

Create `app/graphql/default/subscriptions.graphql`:

```graphql
subscription OnPostCreated {
  postCreated {
    id
    title
    content
    author {
      id
      name
    }
    createdAt
  }
}

subscription OnCommentAdded($postId: ID!) {
  commentAdded(postId: $postId) {
    id
    content
    author {
      id
      name
    }
    createdAt
  }
}

subscription OnNotificationReceived {
  notificationReceived {
    id
    type
    message
    data
    read
    createdAt
  }
}

subscription OnUserTyping($chatId: ID!) {
  userTyping(chatId: $chatId) {
    userId
    username
    isTyping
  }
}
```

### 2. Create Subscription Composable

Create `app/composables/useSubscription.ts`:

```typescript
import { useEventSource } from '@vueuse/core'

export function useSubscription<T>(
  query: string,
  variables?: Record<string, any>
) {
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)

  const { status, close } = useEventSource(
    `/api/graphql?query=${encodeURIComponent(query)}&variables=${encodeURIComponent(
      JSON.stringify(variables || {})
    )}`,
    [],
    {
      onMessage: (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.data) {
            data.value = message.data
          }
          if (message.errors) {
            error.value = new Error(message.errors[0]?.message)
          }
        }
        catch (e) {
          error.value = e as Error
        }
      },
      onError: (err) => {
        error.value = err as Error
      },
    }
  )

  onUnmounted(() => {
    close()
  })

  return {
    data,
    error,
    status,
    close,
  }
}
```

### 3. Use Subscriptions in Components

Create `app/components/PostFeed.vue`:

```vue
<template>
  <div class="post-feed">
    <div
      v-for="post in posts"
      :key="post.id"
      class="post-item"
    >
      <h3>{{ post.title }}</h3>
      <p>{{ post.content }}</p>
      <span>By {{ post.author.name }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const posts = ref<any[]>([])

// Subscribe to new posts
const { data: newPost } = useSubscription(`
  subscription {
    postCreated {
      id
      title
      content
      author {
        id
        name
      }
      createdAt
    }
  }
`)

// Add new posts to the feed
watch(newPost, (post) => {
  if (post) {
    posts.value.unshift(post.postCreated)
  }
})

// Load initial posts
onMounted(async () => {
  const { data } = await useGraphQL('GetPosts')
  if (data?.posts) {
    posts.value = data.posts
  }
})
</script>
```

## Real-Time Typing Indicators

### 1. Add Typing Mutation

```graphql
extend type Mutation {
  setTyping(chatId: ID!, isTyping: Boolean!): Boolean!
}
```

### 2. Implement Typing Resolver

```typescript
export const typingResolvers = defineResolver({
  Mutation: {
    setTyping: async (_parent, { chatId, isTyping }, context) => {
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      await pubsub.publish(`${TOPICS.USER_TYPING}:${chatId}`, {
        userId: context.user.id,
        username: context.user.name,
        chatId,
        isTyping,
      })

      return true
    },
  },
})
```

### 3. Use in Chat Component

```vue
<template>
  <div class="chat">
    <div class="typing-indicator" v-if="usersTyping.length > 0">
      {{ usersTyping.join(', ') }} {{ usersTyping.length === 1 ? 'is' : 'are' }} typing...
    </div>

    <input
      v-model="message"
      @input="handleTyping"
      @blur="stopTyping"
      placeholder="Type a message..."
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  chatId: string
}>()

const message = ref('')
const usersTyping = ref<string[]>([])
let typingTimeout: NodeJS.Timeout

// Subscribe to typing events
const { data: typingEvent } = useSubscription(`
  subscription OnUserTyping($chatId: ID!) {
    userTyping(chatId: $chatId) {
      userId
      username
      isTyping
    }
  }
`, { chatId: props.chatId })

// Update typing users
watch(typingEvent, (event) => {
  if (!event) return

  const { userId, username, isTyping } = event.userTyping

  if (isTyping && !usersTyping.value.includes(username)) {
    usersTyping.value.push(username)
  } else if (!isTyping) {
    usersTyping.value = usersTyping.value.filter(u => u !== username)
  }
})

function handleTyping() {
  // Send typing indicator
  useGraphQL('SetTyping', {
    chatId: props.chatId,
    isTyping: true,
  })

  // Clear previous timeout
  clearTimeout(typingTimeout)

  // Stop typing after 3 seconds of inactivity
  typingTimeout = setTimeout(stopTyping, 3000)
}

function stopTyping() {
  useGraphQL('SetTyping', {
    chatId: props.chatId,
    isTyping: false,
  })
}
</script>
```

## Live Counter Example

### 1. Counter Mutation

```typescript
let counter = 0

export const counterResolvers = defineResolver({
  Mutation: {
    incrementCounter: async () => {
      counter++
      await pubsub.publish(TOPICS.COUNTER_UPDATED, { count: counter })
      return counter
    },

    decrementCounter: async () => {
      counter--
      await pubsub.publish(TOPICS.COUNTER_UPDATED, { count: counter })
      return counter
    },
  },

  Query: {
    counter: () => counter,
  },
})
```

### 2. Live Counter Component

```vue
<template>
  <div class="counter">
    <h2>Live Counter: {{ count }}</h2>
    <button @click="increment">+</button>
    <button @click="decrement">-</button>
  </div>
</template>

<script setup lang="ts">
const count = ref(0)

// Subscribe to counter updates
const { data: counterUpdate } = useSubscription(`
  subscription {
    counterUpdated
  }
`)

watch(counterUpdate, (data) => {
  if (data?.counterUpdated !== undefined) {
    count.value = data.counterUpdated
  }
})

// Load initial value
onMounted(async () => {
  const { data } = await useGraphQL('GetCounter')
  if (data?.counter !== undefined) {
    count.value = data.counter
  }
})

async function increment() {
  await useGraphQL('IncrementCounter')
}

async function decrement() {
  await useGraphQL('DecrementCounter')
}
</script>
```

## Performance Considerations

### 1. Filter Subscriptions

Only send updates to interested clients:

```typescript
subscribe: (_parent, { postId }, context) => {
  // Check authorization
  if (!canAccessPost(context.user, postId)) {
    throw new GraphQLError('Not authorized')
  }

  return pubsub.subscribe(`${TOPICS.POST_UPDATED}:${postId}`)
}
```

### 2. Throttle Updates

Limit the frequency of updates:

```typescript
import { throttle } from 'lodash-es'

const publishThrottled = throttle(
  (topic, payload) => pubsub.publish(topic, payload),
  1000 // Max once per second
)
```

### 3. Clean Up Subscriptions

Ensure subscriptions are properly cleaned up:

```typescript
onUnmounted(() => {
  subscription.close()
})
```

## Testing Subscriptions

```typescript
import { execute, parse, subscribe } from 'graphql'
import { describe, expect, it } from 'vitest'
import { schema } from '../schema'

describe('Subscriptions', () => {
  it('should receive post created events', async () => {
    const document = parse(`
      subscription {
        postCreated {
          id
          title
        }
      }
    `)

    const subscription = await subscribe({
      schema,
      document,
      contextValue: { db },
    })

    // Trigger post creation
    await createPost({ title: 'Test Post' })

    // Get subscription result
    const result = await subscription.next()

    expect(result.value?.data?.postCreated).toBeDefined()
    expect(result.value?.data?.postCreated.title).toBe('Test Post')
  })
})
```

## Best Practices

### 1. Authenticate Subscriptions

Always check authentication for private subscriptions:

```typescript
subscribe: (_parent, _args, context) => {
  if (!context.user) {
    throw new GraphQLError('Authentication required')
  }
  return pubsub.subscribe(topic)
}
```

### 2. Use Scoped Topics

Scope topics to specific resources or users:

```typescript
// Good: Scoped
`POST_UPDATED:${postId}``NOTIFICATIONS:${userId}`

// Bad: Global
`POST_UPDATED`
```

### 3. Implement Rate Limiting

Prevent subscription abuse with rate limiting (see [Rate Limiting recipe](./rate-limiting.md)).

### 4. Handle Connection Lifecycle

Clean up resources when clients disconnect:

```typescript
subscribe: async (_parent, _args, context) => {
  context.req.on('close', () => {
    // Clean up resources
  })
  return pubsub.subscribe(topic)
}
```

## Related Recipes

- [Authentication](./authentication.md) - Securing subscriptions
- [Caching Strategies](./caching-strategies.md) - Caching subscription data
- [Rate Limiting](./rate-limiting.md) - Preventing abuse

## References

- [GraphQL Subscriptions](https://www.graphql-yoga.com/docs/features/subscriptions)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
