---
title: İlk Resolver
description: GraphQL resolver'larınızı oluşturun
icon: heroicons:code-bracket
order: 2
tags:
  - resolver
  - rehber
---

# İlk Resolver

Nitro GraphQL, resolver tanımlamak için tip güvenli yardımcı fonksiyonlar sunar. Tüm fonksiyonlar `nitro-graphql/define`'dan import edilmelidir.

## Hızlı Başlangıç

### 1. Schema Oluştur

`server/graphql/user.graphql`:

```graphql
type User {
  id: ID!
  name: String!
  email: String!
}

type Query {
  users: [User!]!
  user(id: ID!): User
}

type Mutation {
  createUser(input: CreateUserInput!): User!
}

input CreateUserInput {
  name: String!
  email: String!
}
```

### 2. Resolver Oluştur

`server/graphql/user.resolver.ts`:

```typescript
import { defineQuery, defineMutation } from 'nitro-graphql/define'

const users = [
  { id: '1', name: 'Ahmet', email: 'ahmet@example.com' },
  { id: '2', name: 'Ayşe', email: 'ayse@example.com' },
]

export const userQueries = defineQuery({
  users: () => users,
  user: (_, { id }) => users.find(u => u.id === id),
})

export const userMutations = defineMutation({
  createUser: (_, { input }) => {
    const user = { id: String(users.length + 1), ...input }
    users.push(user)
    return user
  },
})
```

### 3. Test Et

`http://localhost:3000/api/graphql` adresini ziyaret edin.

::callout{type="warning"}
Resolver'lar için **named export** kullanın. Default export v2'de desteklenmez.
::

---

## Define Fonksiyonları

### defineQuery

Sadece Query resolver'ları tanımlar:

```typescript
import { defineQuery } from 'nitro-graphql/define'

export const bookQueries = defineQuery({
  books: async (_, __, { context }) => {
    return await context.database.select().from(context.tables.book)
  },
  book: async (_, { id }, { context }) => {
    return await context.database
      .select()
      .from(context.tables.book)
      .where(eq(context.tables.book.id, id))
      .limit(1)
      .then(r => r[0])
  },
})
```

### defineMutation

Sadece Mutation resolver'ları tanımlar:

```typescript
import { defineMutation } from 'nitro-graphql/define'

export const bookMutations = defineMutation({
  createBook: async (_, { input }, { context }) => {
    const { database, tables } = context
    const validated = tables.insertBookSchema.parse(input)
    const [book] = await database.insert(tables.book).values(validated).returning()
    return book
  },
  deleteBook: async (_, { id }, { context }) => {
    const { database, tables } = context
    await database.delete(tables.book).where(eq(tables.book.id, id))
    return true
  },
})
```

### defineResolver

Tam resolver objesi tanımlar (Query + Mutation + Type):

```typescript
import { defineResolver } from 'nitro-graphql/define'

export const postResolver = defineResolver({
  Query: {
    posts: () => posts,
    post: (_, { id }) => posts.find(p => p.id === id),
  },
  Mutation: {
    createPost: (_, { input }) => {
      const post = { id: generateId(), ...input }
      posts.push(post)
      return post
    },
  },
  Post: {
    author: (parent) => users.find(u => u.id === parent.authorId),
  },
})
```

### defineField

Özel tip resolver'ları tanımlar (computed fields):

```typescript
import { defineField } from 'nitro-graphql/define'

export const bookFields = defineField({
  Book: {
    // Veritabanında olmayan hesaplanmış alan
    isAvailable: (parent) => {
      const currentYear = new Date().getFullYear()
      return parent.publishedYear !== null
        && currentYear - Number.parseInt(parent.publishedYear) <= 5
    },
    // İlişkili veri
    author: async (parent, _, { context }) => {
      return await context.database
        .select()
        .from(context.tables.author)
        .where(eq(context.tables.author.id, parent.authorId))
        .limit(1)
        .then(r => r[0])
    },
  },
})
```

### defineSubscription

Subscription resolver'ları tanımlar:

```typescript
import { defineSubscription } from 'nitro-graphql/define'

export const messageSubscriptions = defineSubscription({
  messageAdded: {
    subscribe: async function* (_, { channelId }, { context }) {
      const pubsub = context.pubsub
      yield* pubsub.subscribe(`channel:${channelId}`)
    },
  },
})
```

### defineGraphQLConfig

GraphQL sunucu yapılandırması tanımlar:

```typescript
import { defineGraphQLConfig } from 'nitro-graphql/define'
import { createDefaultMaskError } from 'nitro-graphql/utils'

export default defineGraphQLConfig({
  // Hata maskeleme
  maskedErrors: {
    maskError: createDefaultMaskError(),
  },

  // Context oluşturma
  context: async (event) => {
    const db = useDatabase()
    return {
      context: {
        database: db,
        tables,
        user: await getUserFromEvent(event),
      },
    }
  },

  // GraphiQL etkinleştir
  graphiql: true,
})
```

### defineSchema

Zod/Valibot ile schema doğrulama:

```typescript
import { defineSchema } from 'nitro-graphql/define'
import { z } from 'zod'

export const schemas = defineSchema({
  CreateUserInput: z.object({
    email: z.string().email('Geçerli email giriniz'),
    name: z.string().min(2, 'İsim en az 2 karakter olmalı'),
    age: z.number().min(18, '18 yaşından büyük olmalısınız'),
  }),
})
```

### defineDirective

Özel GraphQL directive'leri tanımlar:

```typescript
import { defineDirective } from 'nitro-graphql/define'
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'
import { defaultFieldResolver } from 'graphql'

export const upperDirective = defineDirective({
  name: 'upper',
  locations: ['FIELD_DEFINITION'],
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, 'upper')?.[0]
        if (directive) {
          const { resolve = defaultFieldResolver } = fieldConfig
          fieldConfig.resolve = async (source, args, context, info) => {
            const result = await resolve(source, args, context, info)
            return typeof result === 'string' ? result.toUpperCase() : result
          }
        }
        return fieldConfig
      },
    })
  },
})
```

---

## Context Kullanımı

Resolver'lar üçüncü parametre olarak context alır:

```typescript
export const userQueries = defineQuery({
  me: async (_, __, { context }) => {
    // H3 event context'e erişim
    const { database, tables, user } = context

    if (!user) {
      throw new Error('Giriş yapmalısınız')
    }

    return await database
      .select()
      .from(tables.user)
      .where(eq(tables.user.id, user.id))
      .limit(1)
      .then(r => r[0])
  },
})
```

### Context Tipleri

`server/graphql/context.d.ts` dosyasında context tiplerini tanımlayın:

```typescript
import type { Database } from '../utils/useDb'
import type { tables } from '../drizzle'

declare module 'nitro/h3' {
  interface H3EventContext {
    database: Database
    tables: typeof tables
    user: { id: string; email: string } | null
  }
}
```

---

## Dosya Organizasyonu

Önerilen yapı:

```
server/graphql/
├── config.ts              # defineGraphQLConfig
├── context.d.ts           # Context tipleri
├── schema.ts              # defineSchema (Zod)
├── users/
│   ├── user.graphql       # Schema
│   ├── queries.resolver.ts
│   ├── mutations.resolver.ts
│   └── field.resolver.ts
└── posts/
    ├── post.graphql
    ├── queries.resolver.ts
    └── mutations.resolver.ts
```

---

## Sonraki Adımlar

- [Harici paketlerle genişletin](/docs/extend)
- [Bağımsız geliştirme için CLI kullanın](/docs/cli)
