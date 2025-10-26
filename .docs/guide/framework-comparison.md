# Framework Comparison

Detailed comparison between GraphQL Yoga and Apollo Server.

## Quick Comparison

| Feature | GraphQL Yoga | Apollo Server |
|---------|-------------|---------------|
| Bundle Size | ✅ Smaller (~200KB) | Larger (~500KB) |
| Performance | ✅ Faster | Fast |
| Federation | Limited | ✅ Full Support |
| Plugins | Modern | ✅ Extensive |
| File Uploads | ✅ Built-in | Requires plugin |
| Subscriptions | ✅ Built-in | Requires setup |
| Setup Complexity | ✅ Simpler | More complex |

## When to Use GraphQL Yoga

Choose GraphQL Yoga if you need:
- Smaller bundle size
- Better performance
- Simple setup
- Built-in features

## When to Use Apollo Server

Choose Apollo Server if you need:
- Apollo Federation
- Extensive plugin ecosystem
- Enterprise features
- Apollo Studio integration

## Switching Frameworks

Simply change the config:

```ts
graphql: {
  framework: 'apollo-server', // or 'graphql-yoga'
}
```

## Next Steps

- [GraphQL Yoga Guide](/guide/graphql-yoga)
- [Apollo Server Guide](/guide/apollo-server)
