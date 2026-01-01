---
title: Extend
description: Harici paketlerden resolver ve schema import edin
icon: heroicons:puzzle-piece
order: 3
tags:
  - ileri-seviye
  - monorepo
  - paketler
---

# Extend

Nitro GraphQL'i harici paketlerden gelen resolver ve schema'larla genişletin. Bu özellik monorepo yapılarında kod paylaşımı, npm paketleri oluşturma ve modüler GraphQL mimarisi için tasarlanmıştır.

## Hızlı Başlangıç

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

Her path otomatik olarak `/resolvers` ve `/schema` ekler:

| Girdi | Import Edilen |
|-------|---------------|
| `@myorg/graphql` | `@myorg/graphql/resolvers` + `@myorg/graphql/schema` |
| `./packages/shared` | `./packages/shared/resolvers` + `./packages/shared/schema` |

---

## Paket Yapısı

Extend paketi belirli bir formatta export etmelidir:

### resolvers.ts

```typescript
// Nitro-uyumlu format: { resolver: ResolverObject } array'i
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
// schemaString export'u zorunlu
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

## Sadece Extend Kullanımı

Local dosyaları yoksaymak için:

```typescript
graphql({
  extend: ['@myorg/complete-api'],
  skipLocalScan: true  // server/graphql/ taranmaz
})
```

::callout{type="info"}
`skipLocalScan: true` kullanın eğer extend paketiniz tüm API'yi içeriyorsa ve local dosyalara ihtiyacınız yoksa.
::
