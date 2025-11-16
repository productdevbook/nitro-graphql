# Nitro GraphQL + Better Auth Example

Authentication + GraphQL API using **Better Auth**, **Drizzle ORM**, and **PostgreSQL**. Demonstrates user authentication, session management, and user-owned resources.

## Get Started

Clone this example using [giget](https://github.com/unjs/giget):

```bash
npx giget@latest gh:productdevbook/nitro-graphql/examples/better-auth my-auth-app
cd my-auth-app
pnpm install
```

Or using pnpm:

```bash
pnpm dlx giget@latest gh:productdevbook/nitro-graphql/examples/better-auth my-auth-app
```

## Features

- 🔐 **Better Auth** - Email/password + GitHub OAuth authentication
- 📝 **Authenticated GraphQL** - User context in all resolvers
- 📚 **User-Owned Books** - CRUD operations with ownership
- 🗄️ **PostgreSQL + Drizzle** - Type-safe database with migrations
- ✅ **Zod Validation** - Input validation with drizzle-zod
- 🐳 **Docker Ready** - Multi-stage build with PostgreSQL
- 🔒 **Session Management** - JWT tokens with Better Auth

## Tech Stack

| Layer | Technology |
|-------|------------|
| Auth | Better Auth 1.3.34 |
| GraphQL | GraphQL Yoga 5.16.2 |
| ORM | Drizzle ORM 0.44.7 |
| Database | PostgreSQL 17 |
| Runtime | Nitro 3 + H3 v2 |
| Validation | Zod + drizzle-zod |

## Development Setup

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your PostgreSQL URL and Better Auth secret

# Run migrations
pnpm db:generate
pnpm db:migrate

# Start dev server
pnpm dev
```

Access GraphQL at: http://localhost:3000/api/graphql

## Docker Deployment

```bash
# Start PostgreSQL + App
docker compose up -d

# View logs
docker compose logs -f app

# Stop
docker compose down
```

## Project Structure

```
examples/better-auth/
├── server/
│   ├── drizzle/
│   │   ├── schema/
│   │   │   ├── auth/              # Better Auth tables
│   │   │   │   ├── user.ts        # User + Zod schema
│   │   │   │   ├── session.ts    # Session + Zod schema
│   │   │   │   ├── account.ts    # OAuth accounts
│   │   │   │   └── verification.ts
│   │   │   └── book.ts            # Business logic
│   │   └── migrations/            # Auto-generated
│   ├── graphql/
│   │   ├── auth/
│   │   │   ├── mutations/
│   │   │   │   ├── sign-in.resolver.ts
│   │   │   │   ├── sign-up.resolver.ts
│   │   │   │   └── sign-out.resolver.ts
│   │   │   └── queries/
│   │   │       └── me.resolver.ts
│   │   ├── books/                 # CRUD resolvers
│   │   ├── config.ts              # Auth context setup
│   │   ├── context.d.ts           # H3 context types
│   │   └── schema.ts              # Zod schemas
│   ├── utils/
│   │   ├── auth.ts                # Better Auth config
│   │   └── useDb.ts               # Database singleton
│   └── routes/
│       └── api/auth/[...all].ts   # Better Auth handler
├── docker-compose.yaml
├── Dockerfile
└── drizzle.config.ts
```

## GraphQL Operations

### Sign Up

```graphql
mutation {
  signUp(email: "user@example.com", password: "password123", name: "John Doe") {
    user {
      id
      name
      email
    }
    session
  }
}
```

### Sign In

```graphql
mutation {
  signIn(email: "user@example.com", password: "password123") {
    user {
      id
      name
      email
    }
    session
  }
}
```

### Get Current User

```graphql
query {
  me {
    id
    name
    email
    emailVerified
  }
}
```

### Create Book (Authenticated)

```graphql
mutation {
  createBook(input: {
    title: "The GraphQL Guide"
    author: "John Resig"
    isbn: "9781234567890"
    publishedYear: "2024"
  }) {
    id
    title
    author
    user {
      name
    }
  }
}
```

### List My Books

```graphql
query {
  books {
    id
    title
    author
    user {
      name
      email
    }
  }
}
```

## Key Concepts

### Auth Context Setup

Better Auth session + user are injected into GraphQL context:

```typescript
// server/graphql/config.ts
export default defineGraphQLConfig({
  context: async (event) => {
    const session = await auth.api.getSession({ headers: event.headers })
    return {
      context: {
        database: useDatabase(),
        tables,
        session: session?.session ?? null,
        user: session?.user ?? null,
      },
    }
  },
})
```

### Using @auth Directive

Protect GraphQL fields declaratively using the `@auth` directive:

**GraphQL Schema:**
```graphql
extend type Query {
  me: User! @auth
}

extend type Mutation {
  createBook(input: CreateBookInput!): Book! @auth
  updateBook(id: ID!, input: UpdateBookInput!): Book @auth
  deleteBook(id: ID!): Boolean! @auth
}
```

**Resolver (no manual auth checks needed):**
```typescript
// server/graphql/books/mutations/create-book.resolver.ts
export const createBook = defineMutation({
  createBook: async (_, { input }, { context }) => {
    // @auth directive guarantees user is authenticated
    const { database, tables, user } = context

    const [book] = await database
      .insert(tables.book)
      .values({ ...input, userId: user.id })
      .returning()

    return book
  },
})
```

**Benefits:**
- No manual `if (!user)` checks
- Declarative and maintainable
- Automatic 401 Unauthorized response
- User guaranteed non-null in resolver

**Implementation:** `server/graphql/directives/auth.directive.ts`

### Drizzle → Zod → GraphQL

```typescript
// 1. Define Drizzle table
export const user = pgTable('user', {
  id: uuid().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
})

// 2. Generate Zod schema
export const selectUserSchema = createSelectSchema(user)

// 3. Use in GraphQL
export default defineSchema({
  User: selectUserSchema,
})
```

## Database Commands

```bash
# Generate migrations
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio
```

## Environment Variables

```env
# Database
NITRO_BOOK_DATABASE_URL=postgresql://user:password@localhost:5432/books

# Better Auth
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## License

MIT
