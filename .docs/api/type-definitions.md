# Type Definitions API Reference

Complete reference for TypeScript types generated and used by Nitro GraphQL.

---

## Generated Types Overview

Nitro GraphQL automatically generates TypeScript types in three categories:

1. **Server Types** (`#graphql/server`) - For resolver implementations
2. **Client Types** (`#graphql/client`) - For frontend queries/mutations
3. **External Types** (`#graphql/client/{serviceName}`) - For external GraphQL services

---

## Server Types

Generated at: `.nitro/types/nitro-graphql-server.d.ts` (or `.nuxt/types/`)

Import via: `#graphql/server`

### Primary Exports

#### Resolvers

Complete resolver type with all GraphQL types and their field resolvers.

```typescript
import type { Resolvers } from '#graphql/server'

export const myResolvers: Resolvers = defineResolver({
  Query: { /* ... */ },
  Mutation: { /* ... */ },
  User: { /* ... */ }
})
```

**Type Definition:**
```typescript
type Resolvers<ContextType = H3Event, ParentType = ResolversParentTypes> = {
  Query?: QueryResolvers<ContextType>
  Mutation?: MutationResolvers<ContextType>
  Subscription?: SubscriptionResolvers<ContextType>
  [CustomType: string]: TypeResolvers<ContextType, ParentType>
}
```

---

#### QueryResolvers

Type for Query field resolvers.

```typescript
import type { QueryResolvers } from '#graphql/server'

export const queries: QueryResolvers = defineQuery({
  user: async (_parent, { id }, context) => {
    return await context.db.users.findById(id)
  },
  users: async (_parent, args, context) => {
    return await context.db.users.findAll()
  }
})
```

**Type Definition:**
```typescript
type QueryResolvers<ContextType = H3Event, ParentType = {}> = {
  [fieldName: string]: Resolver<ReturnType, ParentType, ContextType, Args>
}
```

---

#### MutationResolvers

Type for Mutation field resolvers.

```typescript
import type { MutationResolvers } from '#graphql/server'

export const mutations: MutationResolvers = defineMutation({
  createUser: async (_parent, { input }, context) => {
    return await context.db.users.create(input)
  }
})
```

---

#### SubscriptionResolvers

Type for Subscription field resolvers.

```typescript
import type { SubscriptionResolvers } from '#graphql/server'

export const subscriptions: SubscriptionResolvers = defineSubscription({
  messageAdded: {
    subscribe: (_parent, _args, context) => {
      return context.pubsub.asyncIterator(['MESSAGE_ADDED'])
    }
  }
})
```

---

#### ResolversTypes

Union of all possible GraphQL types in your schema.

```typescript
import type { ResolversTypes } from '#graphql/server'

// Example: User type from schema
type User = ResolversTypes['User']
// { id: string; name: string; email: string; ... }

// Example: Query return type
type UsersQueryResult = ResolversTypes['UsersResult']
```

**Generated Structure:**
```typescript
type ResolversTypes = {
  String: string
  Int: number
  Float: number
  Boolean: boolean
  ID: string
  DateTime: Date
  JSON: any
  Query: {}
  Mutation: {}
  User: User
  Post: Post
  // ... all your GraphQL types
}
```

---

#### ResolversParentTypes

Parent types for field resolvers (usually same as ResolversTypes).

```typescript
import type { ResolversParentTypes } from '#graphql/server'

type PostParent = ResolversParentTypes['Post']
```

---

### Specific Type Resolvers

For each GraphQL type in your schema, a specific resolver type is generated:

```typescript
import type { UserResolvers, PostResolvers } from '#graphql/server'

export const userTypeResolvers: UserResolvers = defineType({
  User: {
    fullName: (parent) => `${parent.firstName} ${parent.lastName}`,
    posts: async (parent, _args, context) => {
      return await context.db.posts.findByUserId(parent.id)
    }
  }
})

export const postTypeResolvers: PostResolvers = defineType({
  Post: {
    author: async (parent, _args, context) => {
      return await context.db.users.findById(parent.authorId)
    }
  }
})
```

---

### Field Argument Types

For each field with arguments, specific argument types are generated:

```typescript
import type {
  QueryUserArgs,
  QueryUsersArgs,
  MutationCreateUserArgs
} from '#graphql/server'

// Field: Query.user(id: ID!): User
type QueryUserArgs = {
  id: string
}

// Field: Query.users(filter: UserFilter, limit: Int): [User!]!
type QueryUsersArgs = {
  filter?: UserFilter
  limit?: number
}

// Field: Mutation.createUser(input: CreateUserInput!): User!
type MutationCreateUserArgs = {
  input: CreateUserInput
}
```

---

### Input Types

All GraphQL input types are generated as TypeScript types:

```typescript
import type {
  CreateUserInput,
  UpdateUserInput,
  UserFilter
} from '#graphql/server'

// GraphQL:
// input CreateUserInput {
//   name: String!
//   email: String!
//   age: Int
// }

type CreateUserInput = {
  name: string
  email: string
  age?: number | null
}

// GraphQL:
// input UserFilter {
//   search: String
//   role: UserRole
//   isActive: Boolean
// }

type UserFilter = {
  search?: string | null
  role?: UserRole | null
  isActive?: boolean | null
}
```

---

### Enum Types

All GraphQL enums are generated as TypeScript enums:

```typescript
import type { UserRole, PostStatus } from '#graphql/server'

// GraphQL:
// enum UserRole {
//   ADMIN
//   USER
//   GUEST
// }

enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}

// GraphQL:
// enum PostStatus {
//   DRAFT
//   PUBLISHED
//   ARCHIVED
// }

enum PostStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}
```

---

### Scalar Types

Custom scalars are mapped to TypeScript types:

```typescript
import type { Scalars } from '#graphql/server'

type Scalars = {
  ID: string
  String: string
  Int: number
  Float: number
  Boolean: boolean
  DateTime: Date      // Custom scalar
  JSON: any           // Custom scalar
  Upload: File        // Custom scalar
}
```

You can customize scalar mappings in configuration:

```typescript
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    codegen: {
      server: {
        scalars: {
          DateTime: 'Date',
          JSON: '{ [key: string]: any }',
          Upload: 'File'
        }
      }
    }
  }
})
```

---

### Context Type

The context type is automatically inferred from your context augmentation:

```typescript
// server/graphql/context.ts
import type { Database } from '../utils/useDb'

declare module 'h3' {
  interface H3EventContext {
    db: Database
    auth?: {
      userId: string
      user: {
        id: string
        role: 'ADMIN' | 'USER'
      }
    }
  }
}
```

Then in resolvers, the context is fully typed:

```typescript
import type { QueryResolvers } from '#graphql/server'

export const queries: QueryResolvers = defineQuery({
  currentUser: async (_parent, _args, context) => {
    // context.db is typed as Database
    // context.auth is typed with optional user
    if (!context.auth?.userId) {
      throw new Error('Not authenticated')
    }

    return await context.db.users.findById(context.auth.userId)
  }
})
```

---

### Module Configuration Type

Access to the Nitro GraphQL configuration:

```typescript
import type { NPMConfig } from '#graphql/server'

// Runtime access to config
const config: NPMConfig = {
  framework: 'graphql-yoga',
  endpoint: { /* ... */ },
  // ...
}
```

---

## Client Types

Generated at: `.nitro/types/nitro-graphql-client.d.ts` (or `.nuxt/types/`)

Import via: `#graphql/client`

### Primary Exports

Client types are generated from your GraphQL documents (queries/mutations).

#### Operation Result Types

For each operation in your `.graphql` files:

```graphql
# app/graphql/users.graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    posts {
      id
      title
    }
  }
}

mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
  }
}
```

Generated types:

```typescript
import type {
  GetUserQuery,
  GetUserQueryVariables,
  CreateUserMutation,
  CreateUserMutationVariables
} from '#graphql/client'

// Query result type
type GetUserQuery = {
  user: {
    id: string
    name: string
    email: string
    posts: Array<{
      id: string
      title: string
    }>
  } | null
}

// Query variables type
type GetUserQueryVariables = {
  id: string
}

// Mutation result type
type CreateUserMutation = {
  createUser: {
    id: string
    name: string
    email: string
  }
}

// Mutation variables type
type CreateUserMutationVariables = {
  input: CreateUserInput
}
```

---

#### Fragment Types

Fragments are also typed:

```graphql
fragment UserFields on User {
  id
  name
  email
  createdAt
}

query GetUsers {
  users {
    ...UserFields
  }
}
```

Generated:

```typescript
import type { UserFieldsFragment, GetUsersQuery } from '#graphql/client'

type UserFieldsFragment = {
  id: string
  name: string
  email: string
  createdAt: string
}

type GetUsersQuery = {
  users: Array<UserFieldsFragment>
}
```

---

#### SDK Types

If SDK generation is enabled, typed SDK functions are available:

```typescript
import { getSdk } from '#graphql/client'

// Get SDK with fetcher
const sdk = getSdk(fetcher)

// Fully typed methods
const user = await sdk.GetUser({ id: '123' })
//    ^? GetUserQuery

const newUser = await sdk.CreateUser({
  input: { name: 'John', email: 'john@example.com' }
})
//    ^? CreateUserMutation
```

---

#### Input Types (Client)

Client input types match server types but use client-side scalar mappings:

```typescript
import type { CreateUserInput } from '#graphql/client'

type CreateUserInput = {
  name: string
  email: string
  age?: number | null
}

// Note: DateTime scalars might be strings on client
type CreatePostInput = {
  title: string
  content: string
  publishedAt?: string | null  // DateTime as string
}
```

Configure client scalar mappings:

```typescript
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    codegen: {
      client: {
        scalars: {
          DateTime: 'string',  // ISO string on client
          JSON: 'any'
        }
      }
    }
  }
})
```

---

## External Service Types

Generated at: `.nitro/types/nitro-graphql-client-{serviceName}.d.ts`

Import via: `#graphql/client/{serviceName}`

### Example: GitHub Service

```typescript
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    externalServices: [
      {
        name: 'github',
        schema: 'https://api.github.com/graphql',
        endpoint: 'https://api.github.com/graphql'
      }
    ]
  }
})
```

```graphql
# app/graphql/github/viewer.graphql
query GetViewer {
  viewer {
    login
    name
    email
    repositories(first: 10) {
      nodes {
        name
        description
      }
    }
  }
}
```

Generated types:

```typescript
import type {
  GetViewerQuery,
  GetViewerQueryVariables
} from '#graphql/client/github'

type GetViewerQuery = {
  viewer: {
    login: string
    name: string | null
    email: string
    repositories: {
      nodes: Array<{
        name: string
        description: string | null
      } | null> | null
    }
  }
}

type GetViewerQueryVariables = {}
```

With SDK:

```typescript
import { getSdk } from '#graphql/client/github'

const githubSdk = getSdk(fetcher)
const viewer = await githubSdk.GetViewer()
//    ^? GetViewerQuery
```

---

## Standard Schema Types

For runtime validation with defineSchema():

```typescript
import type { StandardSchemaV1 } from 'nitro-graphql'

// Standard Schema interface
interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>
}

// Standard Schema properties
namespace StandardSchemaV1 {
  interface Props<Input = unknown, Output = Input> {
    readonly version: 1
    readonly vendor: string
    readonly validate: (
      value: unknown
    ) => Result<Output> | Promise<Result<Output>>
    readonly types?: Types<Input, Output> | undefined
  }

  // Validation result
  type Result<Output> = SuccessResult<Output> | FailureResult

  interface SuccessResult<Output> {
    readonly value: Output
    readonly issues?: undefined
  }

  interface FailureResult {
    readonly issues: ReadonlyArray<Issue>
  }

  interface Issue {
    readonly message: string
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined
  }

  // Type inference
  type InferInput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
  >['input']

  type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
  >['output']
}
```

Usage with validators:

```typescript
import * as v from 'valibot'
import type { StandardSchemaV1 } from 'nitro-graphql'

const userSchema = v.object({
  name: v.string(),
  email: v.pipe(v.string(), v.email())
})

// userSchema satisfies StandardSchemaV1
export default defineSchema({
  CreateUserInput: userSchema
})

// Type inference
type UserInput = StandardSchemaV1.InferInput<typeof userSchema>
// { name: string, email: string }
```

---

## Resolver Type Utilities

### Resolver Function Type

```typescript
type Resolver<TReturn, TParent = {}, TContext = H3Event, TArgs = {}> =
  | ResolverFn<TReturn, TParent, TContext, TArgs>
  | ResolverWithResolve<TReturn, TParent, TContext, TArgs>

type ResolverFn<TReturn, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TReturn | Promise<TReturn>

// For subscriptions
interface ResolverWithResolve<TReturn, TParent, TContext, TArgs> {
  resolve: ResolverFn<TReturn, TParent, TContext, TArgs>
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>
}
```

---

### Field Resolver Type

```typescript
type FieldResolver<
  TParent,
  TReturn,
  TContext = H3Event,
  TArgs = {}
> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TReturn | Promise<TReturn>
```

---

### Subscription Resolver Type

```typescript
type SubscriptionSubscribeFn<TReturn, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TReturn> | Promise<AsyncIterable<TReturn>>
```

---

## Best Practices

### 1. Import Types from Virtual Modules

Always use the virtual module imports for generated types:

```typescript
// ✅ Correct
import type { Resolvers, QueryResolvers } from '#graphql/server'
import type { GetUserQuery } from '#graphql/client'

// ❌ Wrong
import type { Resolvers } from '.nitro/types/nitro-graphql-server'
```

### 2. Use Type Annotations

Explicitly type your resolvers for better IDE support:

```typescript
import type { QueryResolvers, MutationResolvers } from '#graphql/server'

export const queries: QueryResolvers = defineQuery({
  // Fully typed!
})

export const mutations: MutationResolvers = defineMutation({
  // Fully typed!
})
```

### 3. Leverage Context Types

Define your context once and get full type safety:

```typescript
// server/graphql/context.ts
declare module 'h3' {
  interface H3EventContext {
    db: Database
    auth?: AuthContext
  }
}

// All resolvers automatically have typed context
export const queries = defineQuery({
  user: async (_parent, { id }, context) => {
    // context.db is fully typed
    return await context.db.users.findById(id)
  }
})
```

### 4. Use Fragment Types for Consistency

```typescript
import type { UserFieldsFragment } from '#graphql/client'

function formatUser(user: UserFieldsFragment) {
  return {
    displayName: user.name,
    email: user.email
  }
}
```

### 5. Type-Safe Error Handling

```typescript
import { GraphQLError } from 'graphql'
import type { QueryResolvers } from '#graphql/server'

export const queries: QueryResolvers = defineQuery({
  user: async (_parent, { id }, context) => {
    const user = await context.db.users.findById(id)

    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: {
          code: 'NOT_FOUND',
          id
        }
      })
    }

    return user
  }
})
```

---

## Type Generation Configuration

Customize type generation via codegen options:

```typescript
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    codegen: {
      server: {
        // Custom context type
        contextType: '~/server/graphql/context#GraphQLContext',

        // Scalar mappings
        scalars: {
          DateTime: 'Date',
          JSON: '{ [key: string]: any }',
          Upload: 'File'
        },

        // Use type imports
        useTypeImports: true,

        // Add explicit types
        addExplicitTypes: true
      },
      client: {
        // Client scalar mappings
        scalars: {
          DateTime: 'string',
          JSON: 'any'
        },

        // Use type imports
        useTypeImports: true
      }
    }
  }
})
```
