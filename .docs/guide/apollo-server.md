---
title: Apollo Server
category: Guide
---

# Apollo Server

<FunctionInfo fn="apolloServer"/>

Guide to using Apollo Server with Nitro GraphQL, including Federation support.

## Installation

```bash
pnpm add nitro-graphql @apollo/server @apollo/utils.withrequired graphql
```

## Configuration

```ts
// nitro.config.ts
export default defineNitroConfig({
  modules: ['nitro-graphql'],
  graphql: {
    framework: 'apollo-server',
  },
})
```

## Features

- Apollo Sandbox playground
- Federation support
- Plugin ecosystem
- Production-ready

## Apollo Federation

```ts
export default defineNitroConfig({
  graphql: {
    framework: 'apollo-server',
    federation: {
      enabled: true,
      serviceName: 'users-service',
    },
  },
})
```

## Next Steps

- [Apollo Federation](/guide/apollo-federation)
- [GraphQL Yoga](/guide/graphql-yoga)
- [Framework Comparison](/guide/framework-comparison)

---

## Source

<SourceLinks fn="apolloServer"/>

## Contributors

<Contributors fn="apolloServer"/>

## Changelog

<Changelog fn="apolloServer"/>
