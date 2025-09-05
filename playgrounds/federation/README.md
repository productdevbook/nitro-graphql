# Apollo Federation Playground

This playground demonstrates how to create an Apollo Federation subgraph using Nitro GraphQL.

## Features

- **Federation Enabled**: Configured as a subgraph with Apollo Federation v2
- **Entity Definitions**: User entity with `@key` directive for federation
- **Reference Resolvers**: Implementation of `__resolveReference` for federated entities
- **Schema-First Approach**: Using GraphQL schema files with federation directives

## Running the Playground

```bash
# Install dependencies
pnpm install

# Start Apollo Server federation subgraph
pnpm dev:apollo

# Or start GraphQL Yoga federation subgraph
pnpm dev:yoga
```

The subgraph will be available at: http://localhost:3000/api/graphql

## Federation Configuration

### Apollo Server Federation

Configured in `nitro.config.apollo.ts`:

```ts
export default defineNitroConfig({
  graphql: {
    framework: 'apollo-server',
    federation: {
      enabled: true,
      serviceName: 'users-service',
      serviceVersion: '1.0.0',
      serviceUrl: 'http://localhost:3000/api/graphql'
    }
  }
})
```

### GraphQL Yoga Federation

Configured in `nitro.config.yoga.ts`:

```ts
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    federation: {
      enabled: true,
      serviceName: 'users-service-yoga',
      serviceVersion: '1.0.0',
      serviceUrl: 'http://localhost:3000/api/graphql'
    }
  }
})
```

## Schema Structure

- **User Entity**: Defined with `@key(fields: "id")` for federation
- **Federation Directives**: Uses `@external`, `@provides`, `@extends` directives
- **Reference Resolvers**: Implements `__resolveReference` for User entity

## Testing Federation

You can test the subgraph introspection to verify federation support:

```graphql
query {
  _service {
    sdl
  }
}
```

To use this subgraph in a federation gateway, include it in your gateway configuration with the service URL and schema.
