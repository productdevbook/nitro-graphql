---
title: Extend
description: Import resolvers and schemas from external packages
icon: heroicons:puzzle-piece
order: 3
tags:
  - advanced
  - monorepo
  - packages
---

# Extend

Extend Nitro GraphQL with resolvers and schemas from external packages. This feature is designed for code sharing in monorepo structures, creating npm packages, and modular GraphQL architecture.

## Quick Start

```typescript
import graphql from 'nitro-graphql'

export default defineNitroConfig({
  modules: [
    graphql({
      extend: ['@myorg/graphql', './packages/shared-graphql']
    })
  ]
})
```

Each path automatically appends `/resolvers` and `/schema`:

| Input | Imported |
|-------|----------|
| `@myorg/graphql` | `@myorg/graphql/resolvers` + `@myorg/graphql/schema` |
| `./packages/shared` | `./packages/shared/resolvers` + `./packages/shared/schema` |

---

## Package Structure

The extend package must export in a specific format:

### resolvers.ts

```typescript
// Nitro-compatible format: array of { resolver: ResolverObject }
export const resolvers = [
  {
    resolver: {
      Query: {
        users: () => db.users.findMany(),
        user: (_, { id }) => db.users.findById(id)
      }
    }
  },
  {
    resolver: {
      Mutation: {
        createUser: (_, { input }) => db.users.create(input),
        deleteUser: (_, { id }) => db.users.delete(id)
      }
    }
  }
]
```

### schema.ts

```typescript
// schemaString export is required
export const schemaString = `
type Query {
  users: [User!]!
  user(id: ID!): User
}

type User {
  id: ID!
  name: String!
  email: String!
}
`

import { parse } from 'graphql'
export const typeDefs = parse(schemaString)
```

### package.json

```json
{
  "name": "@myorg/graphql",
  "type": "module",
  "exports": {
    ".": "./index.ts",
    "./resolvers": "./resolvers.ts",
    "./schema": "./schema.ts"
  }
}
```

---

## Extend-Only Usage

To ignore local files:

```typescript
graphql({
  extend: ['@myorg/complete-api'],
  skipLocalScan: true  // server/graphql/ won't be scanned
})
```

::callout{type="info"}
Use `skipLocalScan: true` if your extend package contains the complete API and you don't need local files.
::
