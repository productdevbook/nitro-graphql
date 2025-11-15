---
title: GraphQL Schemas
category: Guide
---

# GraphQL Schemas

<FunctionInfo fn="schemas"/>

Learn how to define and organize GraphQL schemas in your Nitro GraphQL application.

## What is a GraphQL Schema?

A GraphQL schema defines the structure of your API:
- **Types**: Data structures (User, Post, Product, etc.)
- **Queries**: Read operations
- **Mutations**: Write operations
- **Inputs**: Complex input arguments
- **Enums**: Fixed sets of values
- **Scalars**: Primitive types (String, Int, custom scalars)

## Creating Your First Schema

Create a `.graphql` file in `server/graphql/`:

```graphql
# server/graphql/schema.graphql
type Query {
  hello: String!
}

type Mutation {
  _empty: String
}
```

::: warning Mutation Requirement
GraphQL Yoga requires at least one Mutation field. Use `_empty: String` if you don't have mutations yet.
:::

## Type Definitions

### Object Types

Define custom types for your data:

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  age: Int
  isActive: Boolean!
  createdAt: DateTime!
}
```

Field modifiers:
- `!` - Non-nullable (required)
- `[Type]` - List/array
- `[Type]!` - Non-nullable list
- `[Type!]!` - Non-nullable list of non-nullable items

Examples:

```graphql
type Post {
  id: ID!                    # Required ID
  title: String!             # Required string
  tags: [String!]!          # Required array of required strings
  comments: [Comment]        # Optional array of optional comments
  author: User!              # Required User object
}
```

### Input Types

Use for complex mutation arguments:

```graphql
input CreateUserInput {
  name: String!
  email: String!
  age: Int
}

input UpdateUserInput {
  name: String
  email: String
  age: Int
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User
}
```

::: tip Input vs Type
- **Type**: Used for output (query/mutation results)
- **Input**: Used for input arguments
- They cannot be used interchangeably
:::

### Enums

Define fixed sets of values:

```graphql
enum UserRole {
  ADMIN
  MODERATOR
  USER
  GUEST
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

type User {
  id: ID!
  name: String!
  role: UserRole!
}
```

Usage in resolvers:

```ts
import { defineQuery } from 'nitro-graphql/define'

export const userQueries = defineQuery({
  usersByRole: (_, { role }) => {
    // role is typed as 'ADMIN' | 'MODERATOR' | 'USER' | 'GUEST'
    return users.filter(u => u.role === role)
  },
})
```

### Scalars

Built-in scalars:
- `String` - UTF-8 character sequence
- `Int` - Signed 32-bit integer
- `Float` - Signed double-precision floating-point value
- `Boolean` - true or false
- `ID` - Unique identifier

Custom scalars (provided by `graphql-scalars`):

```graphql
scalar DateTime
scalar JSON
scalar EmailAddress
scalar URL

type User {
  id: ID!
  email: EmailAddress!
  website: URL
  metadata: JSON
  createdAt: DateTime!
}
```

Nitro GraphQL automatically includes common scalars from the `graphql-scalars` library.

## Extending Types

Split your schema across multiple files using `extend`:

```graphql
# server/graphql/schema.graphql
type Query {
  hello: String!
}

type Mutation {
  _empty: String
}
```

```graphql
# server/graphql/users/user.graphql
type User {
  id: ID!
  name: String!
  email: String!
}

extend type Query {
  users: [User!]!
  user(id: ID!): User
}

extend type Mutation {
  createUser(input: CreateUserInput!): User!
}
```

```graphql
# server/graphql/posts/post.graphql
type Post {
  id: ID!
  title: String!
  authorId: ID!
}

extend type Query {
  posts: [Post!]!
  post(id: ID!): Post
}

extend type Mutation {
  createPost(input: CreatePostInput!): Post!
}
```

All extensions are automatically merged into a single schema.

## Relationships

### One-to-One

```graphql
type User {
  id: ID!
  name: String!
  profile: UserProfile  # One user has one profile
}

type UserProfile {
  bio: String
  avatar: String
  userId: ID!
  user: User!           # Profile belongs to one user
}
```

### One-to-Many

```graphql
type User {
  id: ID!
  name: String!
  posts: [Post!]!       # One user has many posts
}

type Post {
  id: ID!
  title: String!
  authorId: ID!
  author: User!         # One post has one author
}
```

### Many-to-Many

```graphql
type User {
  id: ID!
  name: String!
  groups: [Group!]!     # User belongs to many groups
}

type Group {
  id: ID!
  name: String!
  members: [User!]!     # Group has many users
}
```

::: tip Resolver Implementation
See the [Resolvers Guide](/guide/resolvers) for how to implement these relationships in your resolvers.
:::

## Interfaces

Define shared fields across types:

```graphql
interface Node {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type User implements Node {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  name: String!
  email: String!
}

type Post implements Node {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  title: String!
  content: String!
}

type Query {
  node(id: ID!): Node
}
```

Resolver:

```ts
import { defineQuery, defineType } from 'nitro-graphql/define'

export const nodeResolver = defineQuery({
  node: (_, { id }) => {
    // Return User or Post
    return findById(id)
  },
})

export const nodeTypes = defineType({
  Node: {
    __resolveType(obj) {
      if ('email' in obj)
        return 'User'
      if ('content' in obj)
        return 'Post'
      return null
    },
  },
})
```

## Union Types

Return one of several types:

```graphql
union SearchResult = User | Post | Comment

type Query {
  search(query: String!): [SearchResult!]!
}
```

Resolver:

```ts
import { defineType } from 'nitro-graphql/define'

export const searchTypes = defineType({
  SearchResult: {
    __resolveType(obj) {
      if ('email' in obj)
        return 'User'
      if ('content' in obj)
        return 'Post'
      if ('postId' in obj)
        return 'Comment'
      return null
    },
  },
})
```

Client query:

```graphql
query Search($query: String!) {
  search(query: $query) {
    __typename
    ... on User {
      id
      name
      email
    }
    ... on Post {
      id
      title
      content
    }
    ... on Comment {
      id
      text
    }
  }
}
```

## Directives in Schema

Use directives to add metadata and behavior:

```graphql
type Query {
  # Authentication required
  profile: User @auth

  # Admin-only
  adminData: String @auth(requires: "ADMIN")

  # Cached for 5 minutes
  expensiveData: String @cache(ttl: 300)

  # Deprecated field
  oldEndpoint: String @deprecated(reason: "Use newEndpoint instead")
}
```

::: tip Custom Directives
Learn how to create custom directives in the [Custom Directives Guide](/guide/custom-directives).
:::

## File Organization

### Single File Approach

Good for small projects:

```
server/graphql/
└── schema.graphql
```

### Feature-Based Organization

Recommended for larger projects:

```
server/graphql/
├── schema.graphql          # Root Query/Mutation
├── users/
│   └── user.graphql        # User types, extend Query/Mutation
├── posts/
│   └── post.graphql        # Post types, extend Query/Mutation
├── comments/
│   └── comment.graphql     # Comment types
└── _scalars.graphql        # Shared scalars
```

### Domain-Driven Organization

For very large projects:

```
server/graphql/
├── schema.graphql
├── auth/
│   ├── user.graphql
│   └── session.graphql
├── content/
│   ├── post.graphql
│   ├── comment.graphql
│   └── media.graphql
└── commerce/
    ├── product.graphql
    ├── order.graphql
    └── payment.graphql
```

## Schema Documentation

Add descriptions to your schema:

```graphql
"""
Represents a user in the system.
Users can create posts and comments.
"""
type User {
  "Unique identifier for the user"
  id: ID!

  "User's full name"
  name: String!

  "User's email address (must be unique)"
  email: String!

  """
  User's role in the system.
  Determines permissions and access levels.
  """
  role: UserRole!
}

"""
Input for creating a new user
"""
input CreateUserInput {
  "User's full name (2-100 characters)"
  name: String!

  "Valid email address"
  email: String!
}
```

These descriptions appear in:
- GraphQL Playground
- Generated documentation
- IDE autocomplete

## Common Patterns

### Pagination

```graphql
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type UserEdge {
  cursor: String!
  node: User!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type Query {
  users(
    first: Int
    after: String
    last: Int
    before: String
  ): UserConnection!
}
```

### Filtering

```graphql
input UserFilter {
  name: String
  email: String
  role: UserRole
  isActive: Boolean
  createdAfter: DateTime
  createdBefore: DateTime
}

type Query {
  users(
    filter: UserFilter
    limit: Int = 10
    offset: Int = 0
  ): [User!]!
}
```

### Sorting

```graphql
enum SortOrder {
  ASC
  DESC
}

input UserSort {
  field: String!
  order: SortOrder!
}

type Query {
  users(
    sort: UserSort
    limit: Int = 10
  ): [User!]!
}
```

### Response Unions

```graphql
type User {
  id: ID!
  name: String!
}

type ValidationError {
  field: String!
  message: String!
}

union CreateUserResult = User | ValidationError

type Mutation {
  createUser(input: CreateUserInput!): CreateUserResult!
}
```

Client usage:

```graphql
mutation {
  createUser(input: {name: "John", email: "invalid"}) {
    __typename
    ... on User {
      id
      name
    }
    ... on ValidationError {
      field
      message
    }
  }
}
```

## Auto-Generated Files

Nitro GraphQL generates these schema-related files:

### server/graphql/schema.ts

Export of your merged schema (auto-generated if it doesn't exist):

```ts
// This file is auto-generated
export const typeDefs = `
  type Query { ... }
  type Mutation { ... }
  type User { ... }
`
```

Don't edit this file - it's regenerated on changes.

### graphql.config.ts

GraphQL IDE configuration (auto-generated):

```ts
export default {
  schema: './server/graphql/**/*.graphql',
  documents: './app/graphql/**/*.graphql'
}
```

::: tip Disabling Auto-Generation
You can disable auto-generated files:

```ts
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    scaffold: {
      graphqlConfig: false, // Don't generate graphql.config.ts
      serverSchema: false, // Don't generate schema.ts
    }
  }
})
```

See [File Generation Control](/guide/file-generation-control) for details.
:::

## Best Practices

### 1. Use Descriptive Names

```graphql
# ✅ Good
type User {
  id: ID!
  fullName: String!
  emailAddress: String!
}

# ❌ Bad
type User {
  id: ID!
  n: String!
  e: String!
}
```

### 2. Prefer Input Types

```graphql
# ✅ Good
input CreateUserInput {
  name: String!
  email: String!
  age: Int
}

type Mutation {
  createUser(input: CreateUserInput!): User!
}

# ❌ Bad (too many arguments)
type Mutation {
  createUser(
    name: String!
    email: String!
    age: Int
    address: String
    phone: String
  ): User!
}
```

### 3. Make Fields Non-Nullable When Possible

```graphql
# ✅ Good - Clear requirements
type User {
  id: ID!
  name: String!
  email: String!
  bio: String        # Nullable - actually optional
}

# ❌ Bad - Everything nullable
type User {
  id: ID
  name: String
  email: String
}
```

### 4. Use Enums for Fixed Values

```graphql
# ✅ Good
enum Status {
  ACTIVE
  INACTIVE
  PENDING
}

# ❌ Bad
type User {
  status: String  # Any string allowed
}
```

### 5. Document Your Schema

```graphql
"""
User account in the system
"""
type User {
  "Unique user identifier"
  id: ID!

  "User's display name"
  name: String!
}
```

## Next Steps

<div class="next-steps-grid">
<div class="next-step-card">
<h3>🔧 Resolvers</h3>
<p>Implement schema resolvers</p>
<a href="/guide/resolvers">Resolvers Guide →</a>
</div>

<div class="next-step-card">
<h3>🎯 Type Generation</h3>
<p>Use generated TypeScript types</p>
<a href="/guide/type-generation">Type Generation →</a>
</div>

<div class="next-step-card">
<h3>📁 File Organization</h3>
<p>Best practices for organizing schemas</p>
<a href="/guide/file-organization">File Organization →</a>
</div>

<div class="next-step-card">
<h3>🎭 Custom Directives</h3>
<p>Create reusable schema directives</p>
<a href="/guide/custom-directives">Custom Directives →</a>
</div>
</div>

<style scoped>
.next-steps-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin: 24px 0;
}

.next-step-card {
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  transition: all 0.3s;
}

.next-step-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(225, 0, 152, 0.1);
}

.next-step-card h3 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 16px;
}

.next-step-card p {
  margin-bottom: 12px;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.next-step-card a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
}

@media (max-width: 768px) {
  .next-steps-grid {
    grid-template-columns: 1fr;
  }
}
</style>

---

## Source

<SourceLinks fn="schemas"/>

## Contributors

<Contributors fn="schemas"/>

## Changelog

<Changelog fn="schemas"/>
