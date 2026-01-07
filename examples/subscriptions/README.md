# GraphQL Subscriptions Example

Real-time chat with GraphQL Subscriptions over WebSocket.

## Setup

```bash
pnpm install
pnpm dev
```

## Test

1. Open http://localhost:3000/api/graphql
2. Subscribe:
```graphql
subscription {
  messageReceived {
    id
    text
    author
  }
}
```

3. In another tab, send a message:
```graphql
mutation {
  sendMessage(text: "Hello!", author: "User") {
    id
  }
}
```

## WebSocket Endpoint

`ws://localhost:3000/api/graphql/ws`
