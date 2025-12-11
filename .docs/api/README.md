# API Reference

Complete API reference documentation for Nitro GraphQL.

---

## Overview

This API reference covers all configuration options, resolver functions, type definitions, virtual imports, utilities, and hooks provided by Nitro GraphQL.

---

## Table of Contents

### [Configuration](./configuration.md)

Complete reference for all configuration options available in Nitro GraphQL:

- **NitroGraphQLOptions** - Main configuration interface
- **File Generation Configuration** - Control which files are generated
  - ScaffoldConfig - Scaffold/boilerplate files
  - ClientUtilsConfig - Client utilities (Nuxt only)
  - SdkConfig - GraphQL SDK files
  - TypesConfig - TypeScript type definitions
  - PathsConfig - Global path overrides
- **ExternalGraphQLService** - External GraphQL API integration
- **FederationConfig** - Apollo Federation support
- **CodegenConfig** - Code generation customization
- **LoaderConfig** - GraphQL file loading

[Read Configuration Reference →](./configuration.md)

---

### [Resolver Functions](./resolver-functions.md)

Complete reference for resolver definition utilities:

- **defineResolver()** - Define complete resolvers (Query + Mutation + Types)
- **defineQuery()** - Define query-only resolvers
- **defineMutation()** - Define mutation-only resolvers
- **defineSubscription()** - Define subscription-only resolvers
- **defineField()** - Define custom type field resolvers
- **defineDirective()** - Define custom GraphQL directives
- **defineGraphQLConfig()** - Define GraphQL server configuration
- **defineSchema()** - Define schema with validation (Standard Schema)

All functions are auto-imported in resolver files.

[Read Resolver Functions Reference →](./resolver-functions.md)

---

### [Type Definitions](./type-definitions.md)

Complete reference for TypeScript types generated and used by Nitro GraphQL:

- **Server Types** (`#graphql/server`)
  - Resolvers, QueryResolvers, MutationResolvers, SubscriptionResolvers
  - ResolversTypes, ResolversParentTypes
  - Input types, Enum types, Scalar types
  - Field argument types
  - Context types
- **Client Types** (`#graphql/client`)
  - Operation result types (Query/Mutation)
  - Fragment types
  - SDK types
  - Input types (client-side)
- **External Service Types** (`#graphql/client/{serviceName}`)
  - Service-specific operations
  - Service-specific SDKs
- **Standard Schema Types** - Runtime validation types

[Read Type Definitions Reference →](./type-definitions.md)

---

### [Virtual Imports](./virtual-imports.md)

Complete reference for virtual module imports:

- **Public Virtual Imports**
  - `#graphql/server` - Server-side types
  - `#graphql/client` - Client-side types
  - `#graphql/client/{serviceName}` - External service types
  - `#graphql/schema` - Schema definition
- **Internal Virtual Imports** (framework internals)
  - `#nitro-internal-virtual/server-schemas`
  - `#nitro-internal-virtual/server-resolvers`
  - `#nitro-internal-virtual/server-directives`
  - `#nitro-internal-virtual/graphql-config`
  - `#nitro-internal-virtual/module-config`
- Virtual import resolution and troubleshooting

[Read Virtual Imports Reference →](./virtual-imports.md)

---

### [Apollo Utilities](./apollo-utilities.md)

Complete reference for Apollo Server integration and Federation:

- **startServerAndCreateH3Handler()** - Create H3 handler for Apollo Server
- **buildSubgraphSchema()** - Build federated GraphQL subgraphs
- **FederationConfig** - Federation configuration
- **Reference Resolvers** - Entity reference resolution
- Complete federation examples (Users + Posts subgraphs + Gateway)

[Read Apollo Utilities Reference →](./apollo-utilities.md)

---

### [Hooks](./hooks.md)

Complete reference for Nitro hooks used by and available to Nitro GraphQL:

- **Build Hooks**
  - `rollup:before` - Configure Rollup bundling
  - `types:extend` - Extend TypeScript types
  - `build:before` - Pre-build preparation
- **Development Hooks**
  - `dev:start` - Development server start
  - `dev:reload` - Development server reload
- **Runtime Hooks**
  - `close` - Cleanup and shutdown
- Custom hook patterns and examples

[Read Hooks Reference →](./hooks.md)

---

## Quick Links

### Getting Started

- [Installation Guide](../guides/getting-started.md)
- [Quick Start Tutorial](../guides/quick-start.md)
- [Configuration Guide](../guides/configuration.md)

### Guides

- [Creating Resolvers](../guides/resolvers.md)
- [Working with Types](../guides/types.md)
- [External Services](../guides/external-services.md)
- [Apollo Federation](../guides/federation.md)

### Examples

- [Basic Setup](../examples/basic-setup.md)
- [Nuxt Integration](../examples/nuxt-integration.md)
- [Apollo Server](../examples/apollo-server.md)
- [Federation](../examples/federation.md)

---

## API Categories

### Configuration APIs

Configure Nitro GraphQL behavior, file generation, and integrations:

```typescript
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    scaffold: { /* ... */ },
    types: { /* ... */ },
    externalServices: [/* ... */],
    federation: { /* ... */ }
  }
})
```

[Configuration Reference →](./configuration.md)

---

### Resolver APIs

Define GraphQL resolvers with full type safety:

```typescript
export const userQueries = defineQuery({
  user: async (_parent, { id }, context) => {
    return await context.db.users.findById(id)
  }
})

export const userMutations = defineMutation({
  createUser: async (_parent, { input }, context) => {
    return await context.db.users.create(input)
  }
})
```

[Resolver Functions Reference →](./resolver-functions.md)

---

### Type APIs

Access generated TypeScript types:

```typescript
import type {
  CreateUserMutationVariables,
  GetUserQuery,
  QueryResolvers,
  Resolvers
} from '#graphql/server'

export const queries: QueryResolvers = defineQuery({
  // Fully typed resolver
})
```

[Type Definitions Reference →](./type-definitions.md)

---

### Virtual Import APIs

Import types and utilities via virtual modules:

```typescript
// Client types
import type { GetUserQuery } from '#graphql/client'

// External service types
import type { GetViewerQuery } from '#graphql/client/github'

// Server types
import type { Resolvers } from '#graphql/server'

// Schema definition
import schema from '#graphql/schema'
```

[Virtual Imports Reference →](./virtual-imports.md)

---

### Apollo APIs

Apollo Server and Federation utilities:

```typescript
import { buildSubgraphSchema, startServerAndCreateH3Handler } from 'nitro-graphql/utils/apollo'

const schema = buildSubgraphSchema({
  typeDefs,
  resolvers
})

export default startServerAndCreateH3Handler(server, {
  context: async ({ event }) => ({ /* ... */ })
})
```

[Apollo Utilities Reference →](./apollo-utilities.md)

---

### Hook APIs

Extend Nitro GraphQL behavior with hooks:

```typescript
export default defineNitroConfig({
  hooks: {
    'dev:start': async () => {
      // Custom initialization
    },
    'types:extend': (types) => {
      // Add custom type paths
    }
  }
})
```

[Hooks Reference →](./hooks.md)

---

## Version Compatibility

This API reference is for **Nitro GraphQL v2.0+** (Nitro v3 / H3 v2).

### Breaking Changes from v1.x

- H3 v2 context augmentation (`.ts` instead of `.d.ts`)
- Named exports required for resolvers (no default exports)
- New file generation control system
- Updated virtual import paths

See [Migration Guide](../guides/migration.md) for details.

---

## Contributing

Found an error or want to improve the documentation?

1. [Open an issue](https://github.com/arashsheyda/nitro-graphql/issues)
2. [Submit a pull request](https://github.com/arashsheyda/nitro-graphql/pulls)
3. [Join discussions](https://github.com/arashsheyda/nitro-graphql/discussions)

---

## Support

- **Documentation**: [nitro-graphql.dev](https://nitro-graphql.dev)
- **GitHub**: [arashsheyda/nitro-graphql](https://github.com/arashsheyda/nitro-graphql)
- **Discord**: [Nuxt Discord #nitro-graphql](https://discord.gg/nuxt)

---

## License

MIT License - see [LICENSE](../../LICENSE) for details.
