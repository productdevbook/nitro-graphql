---
title: Subscriptions
category: Guide
---

# Subscriptions

<FunctionInfo fn="subscriptions"/>

Real-time GraphQL subscriptions with WebSocket support.

## Define Subscription Schema

```graphql
type Subscription {
  messageAdded(channelId: ID!): Message!
  userTyping(channelId: ID!): User!
}

type Message {
  id: ID!
  content: String!
  userId: ID!
}
```

## Implement Subscription Resolvers

```ts
export const messageSubscriptions = defineSubscription({
  messageAdded: {
    subscribe: (parent, { channelId }, context) => {
      return context.pubsub.asyncIterator([`MESSAGE_${channelId}`])
    },
    resolve: payload => payload,
  },

  userTyping: {
    subscribe: (parent, { channelId }, context) => {
      return context.pubsub.asyncIterator([`TYPING_${channelId}`])
    },
  },
})
```

## Publish Events

```ts
export const messageMutations = defineMutation({
  sendMessage: async (parent, { input }, context) => {
    const message = await context.db.message.create({
      data: input
    })

    // Publish to subscribers
    await context.pubsub.publish(`MESSAGE_${input.channelId}`, message)

    return message
  },
})
```

## Client Usage

```ts
const { data } = await useAsyncData(
  () => $fetch('/api/graphql', {
    method: 'POST',
    body: {
      query: `
        subscription {
          messageAdded(channelId: "1") {
            id
            content
          }
        }
      `
    }
  })
)
```

## Next Steps

- [Resolvers](/guide/resolvers)
- [GraphQL Yoga](/guide/graphql-yoga)

---

## Source

<SourceLinks fn="subscriptions"/>

## Contributors

<Contributors fn="subscriptions"/>

## Changelog

<Changelog fn="subscriptions"/>
