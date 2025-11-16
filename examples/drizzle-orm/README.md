# Nitro GraphQL + Drizzle ORM Example

This example demonstrates a complete book management GraphQL API using **Nitro GraphQL v2** with **Drizzle ORM** and **PostgreSQL**. It showcases best practices for database integration, Zod validation, custom field resolvers, and error handling.

## Features

- ✅ **Drizzle ORM Integration** - Type-safe database queries with PostgreSQL
- ✅ **Zod Validation** - Input validation using `drizzle-zod` generated schemas
- ✅ **Context-Based Access** - Database and tables provided through GraphQL context
- ✅ **Custom Field Resolvers** - Computed fields (e.g., `isAvailable`)
- ✅ **Error Handling** - Automatic masking of ZodError and HTTPError
- ✅ **V2 Explicit Imports** - All resolvers use explicit imports (no auto-imports)
- ✅ **H3 v2 Context** - Modern H3 event context pattern with type augmentation
- ✅ **Drizzle Kit** - Database migrations and schema management
- ✅ **Organized Structure** - Modular resolver and schema organization
- ✅ **Docker Support** - Multi-stage Dockerfile with PostgreSQL integration

## Prerequisites

- **Node.js** 18+
- **pnpm** 10+
- **PostgreSQL** database (local or remote)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Database Setup

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` and configure your PostgreSQL connection:

```env
NITRO_BOOK_DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
```

### 3. Run Migrations

Generate and run database migrations:

```bash
# Generate migration files from schema
pnpm db:generate

# Apply migrations to database
pnpm db:migrate
```

### 4. Start Development Server

```bash
pnpm dev
```

The GraphQL playground will be available at:
- **Endpoint**: http://localhost:3000/api/graphql
- **Health Check**: http://localhost:3000/api/graphql/health

## Project Structure

```
examples/drizzle-orm/
├── server/
│   ├── drizzle/
│   │   ├── schema/
│   │   │   ├── book.ts          # Drizzle table + Zod schemas
│   │   │   ├── shared.ts        # Reusable helpers (custom timestamp)
│   │   │   └── index.ts         # Schema exports
│   │   ├── migrations/          # Drizzle Kit migrations
│   │   └── index.ts             # Export schema and tables
│   ├── graphql/
│   │   ├── books/
│   │   │   ├── book.graphql     # GraphQL type definitions
│   │   │   ├── field.resolver.ts    # Custom field resolver
│   │   │   ├── queries/
│   │   │   │   ├── books.resolver.ts   # List all books
│   │   │   │   └── book.resolver.ts    # Get single book
│   │   │   └── mutations/
│   │   │       ├── create-book.resolver.ts
│   │   │       ├── update-book.resolver.ts
│   │   │       └── delete-book.resolver.ts
│   │   ├── config.ts            # GraphQL Yoga configuration + context setup
│   │   ├── context.d.ts         # H3 context type augmentation
│   │   └── schema.ts            # Schema definition with Zod
│   ├── drizzle/
│   │   └── index.ts             # Schema exports (tables + Zod)
│   └── utils/
│       └── useDb.ts             # Database singleton (used by context)
├── drizzle.config.ts            # Drizzle Kit configuration
├── nitro.config.ts              # Nitro configuration
└── package.json
```

## Key Concepts

### 1. Drizzle → Zod → GraphQL Flow

This example demonstrates a powerful pattern for type safety and validation:

**Step 1: Define Drizzle Schema** (`server/drizzle/schema/book.ts`)
```typescript
import { pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core'
import { v7 as uuidv7 } from 'uuid'
import { customTimestamp } from './shared'

export const book = pgTable('book', {
  id: uuid().primaryKey().$defaultFn(uuidv7),
  title: varchar({ length: 255 }).notNull(),
  author: varchar({ length: 255 }).notNull(),
  isbn: varchar({ length: 13 }).unique(),
  description: text(),
  publishedYear: varchar({ length: 4 }),
  createdAt: customTimestamp().defaultNow().notNull(),
  updatedAt: customTimestamp().defaultNow().notNull().$onUpdateFn(() => new Date().toISOString()),
})
```

**Step 2: Generate Zod Schemas** (same file)
```typescript
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

export const insertBookSchema = createInsertSchema(book, {
  title: schema => schema.min(1, 'Title is required'),
  author: schema => schema.min(1, 'Author is required'),
  isbn: schema => schema.length(13, 'ISBN must be 13 characters').optional(),
  publishedYear: schema => schema.regex(/^\d{4}$/, 'Year must be 4 digits').optional(),
})

export const selectBookSchema = createSelectSchema(book)
```

**Step 3: Use in GraphQL Schema** (`server/graphql/schema.ts`)
```typescript
import { defineSchema } from 'nitro-graphql/define'
import { selectBookSchema } from '../drizzle/schema'

export default defineSchema({
  Book: selectBookSchema, // Integrates Zod schema with GraphQL
})
```

**Step 4: Use in Mutations**
```typescript
import { defineMutation } from 'nitro-graphql/define'

export const createBook = defineMutation({
  createBook: async (_, { input }, { context }) => {
    const { database, tables } = context

    // Validates input and throws ZodError if invalid
    const validatedInput = tables.insertBookSchema.parse(input)

    const [newBook] = await database
      .insert(tables.book)
      .values(validatedInput)
      .returning()
    return newBook
  },
})
```

### 2. V2 Explicit Imports

**Important**: In Nitro GraphQL v2, resolver utilities are **NOT auto-imported**. You must explicitly import them:

```typescript
// REQUIRED in all resolver files
import { defineMutation, defineQuery, defineType } from 'nitro-graphql/define'
```

**Available utilities**:
- `defineResolver` - Complete resolver (Query + Mutation + Type)
- `defineQuery` - Query-only resolvers
- `defineMutation` - Mutation-only resolvers
- `defineType` - Custom type resolvers (computed fields)
- `defineDirective` - Custom GraphQL directives
- `defineGraphQLConfig` - GraphQL Yoga configuration
- `defineSchema` - Schema definition with Zod integration

### 3. Context-Based Database Access

**New in v2**: Instead of importing `useDatabase()` in each resolver, the database connection and tables are provided through GraphQL context for better testability and consistency.

**Context Setup** (`server/graphql/config.ts`)
```typescript
import { defineGraphQLConfig } from 'nitro-graphql/define'
import { createDefaultMaskError } from 'nitro-graphql/utils'
import { tables } from '../drizzle'
import { useDatabase } from '../utils/useDb'

export default defineGraphQLConfig({
  maskedErrors: {
    maskError: createDefaultMaskError(),
  },
  context: async (event) => {
    const db = useDatabase()
    return {
      context: {
        tables, // Drizzle schemas and Zod validators
        database: db, // Database connection
      },
    }
  },
})
```

**Context Types** (`server/graphql/context.d.ts`)
```typescript
import type { tables } from '../drizzle'
import type { Database } from '../utils/useDb'

declare module 'nitro/h3' {
  interface H3EventContext {
    database: Database
    tables: tables
  }
}
```

**Using Context in Resolvers**
```typescript
import { defineQuery } from 'nitro-graphql/define'

export const booksQuery = defineQuery({
  books: async (parent, args, { context }) => {
    const { database, tables } = context
    return await database.select().from(tables.book)
  },
})
```

### 4. Custom Field Resolvers

The example includes a computed field `isAvailable` that isn't stored in the database:

**GraphQL Schema** (`server/graphql/books/book.graphql`)
```graphql
type Book {
  id: ID!
  title: String!
  author: String!
  isbn: String
  description: String
  publishedYear: String
  createdAt: String!
  updatedAt: String!
  isAvailable: Boolean!  # Computed field
}
```

**Resolver** (`server/graphql/books/field.resolver.ts`)
```typescript
import { defineType } from 'nitro-graphql/define'

export const field = defineType({
  Book: {
    isAvailable: (parent, args, { context }) => {
      // A book is considered available if it was published within the last 5 years
      const currentYear = new Date().getFullYear()
      return parent.publishedYear !== null
        && currentYear - Number.parseInt(parent.publishedYear) <= 5
    },
  },
})
```

### 5. Error Handling

The example uses `createDefaultMaskError()` to handle validation and HTTP errors gracefully:

**Configuration** (`server/graphql/config.ts`)
```typescript
import { defineGraphQLConfig } from 'nitro-graphql/define'
import { createDefaultMaskError } from 'nitro-graphql/utils'

export default defineGraphQLConfig({
  maskedErrors: {
    maskError: createDefaultMaskError(), // Handles ZodError, HTTPError
  },
})
```

**Benefits**:
- **ZodError**: Automatically formats validation errors for clients
- **HTTPError**: Properly exposes status codes and messages
- **Other Errors**: Masked as "Internal Server Error" for security

### 6. Database Singleton Pattern

The `useDatabase()` utility ensures only one database connection is created and is called once in the context setup:

**Implementation** (`server/utils/useDb.ts`)
```typescript
import { drizzle } from 'drizzle-orm/node-postgres'
import { tables } from '../drizzle'

export type Database = ReturnType<typeof useDatabaseConnect>

let _database: ReturnType<typeof useDatabaseConnect>

function useDatabaseConnect() {
  return drizzle(process.env.NITRO_BOOK_DATABASE_URL as string, {
    casing: 'camelCase',
    schema: tables,
  })
}

export function useDatabase() {
  if (!_database) {
    _database = useDatabaseConnect()
  }
  return _database
}
```

**Used in Context** (`server/graphql/config.ts`)
```typescript
import { tables } from '../drizzle'
import { useDatabase } from '../utils/useDb'

export default defineGraphQLConfig({
  context: async (event) => {
    const db = useDatabase()
    return {
      context: {
        database: db,
        tables,
      },
    }
  },
})
```

## Example Queries & Mutations

### Create a Book

```graphql
mutation {
  createBook(input: {
    title: "The GraphQL Guide"
    author: "John Resig"
    isbn: "9781234567890"
    description: "A comprehensive guide to GraphQL"
    publishedYear: "2024"
  }) {
    id
    title
    author
    isbn
    publishedYear
    isAvailable
  }
}
```

### List All Books

```graphql
query {
  books {
    id
    title
    author
    isbn
    description
    publishedYear
    isAvailable
    createdAt
    updatedAt
  }
}
```

### Get Single Book

```graphql
query {
  book(id: "uuid-here") {
    id
    title
    author
    isbn
    description
    publishedYear
    isAvailable
    createdAt
    updatedAt
  }
}
```

### Update a Book

```graphql
mutation {
  updateBook(
    id: "uuid-here"
    input: {
      title: "The Complete GraphQL Guide"
      publishedYear: "2025"
    }
  ) {
    id
    title
    publishedYear
    isAvailable
  }
}
```

### Delete a Book

```graphql
mutation {
  deleteBook(id: "uuid-here")
}
```

Note: This performs a hard delete, removing the book from the database.

## Database Commands

```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply pending migrations to database
pnpm db:migrate

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

## Docker Deployment

This example includes Docker support for production deployment with PostgreSQL.

### Quick Start with Docker Compose

The easiest way to run the application in production mode:

```bash
# Build and start all services (PostgreSQL + App)
docker compose up -d

# View logs
docker compose logs -f app

# Stop services
docker compose down

# Stop and remove volumes (⚠️ deletes database data)
docker compose down -v
```

The application will be available at:
- **GraphQL Endpoint**: http://localhost:3000/api/graphql
- **Health Check**: http://localhost:3000/api/graphql/health

### Docker Architecture

**Multi-stage Dockerfile**:
1. **deps stage**: Installs dependencies with pnpm
2. **builder stage**: Builds the Nitro application
3. **runner stage**: Lightweight production image with srvx runtime

**Services** (docker-compose.yaml):
- **postgres**: PostgreSQL 17 Alpine with persistent volume
- **app**: Nitro GraphQL application with automatic migrations

### Environment Variables

Configure via environment variables or `.env` file:

```env
# Database (automatically set in docker-compose.yaml)
NITRO_BOOK_DATABASE_URL=postgresql://postgres:postgres_dev_password@postgres:5432/books

# Application
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
```

### Production Deployment

For production deployment, update the following in `docker-compose.yaml`:

1. **Change database credentials**:
```yaml
environment:
  POSTGRES_PASSWORD: your-strong-password
  NITRO_BOOK_DATABASE_URL: postgresql://postgres:your-strong-password@postgres:5432/books
```

2. **Use secrets** (recommended):
```yaml
secrets:
  db_password:
    file: ./secrets/db_password.txt
```

3. **Configure persistent volumes** for backups

4. **Set up reverse proxy** (nginx/traefik) for HTTPS

### Docker Commands

```bash
# Build image only
docker compose build

# Rebuild without cache
docker compose build --no-cache

# Run in foreground (see logs directly)
docker compose up

# Scale app service (if using load balancer)
docker compose up -d --scale app=3

# Execute commands in running container
docker compose exec app sh
docker compose exec postgres psql -U postgres -d books

# View database logs
docker compose logs -f postgres
```

### Health Checks

The application includes built-in health checks:

- **Docker healthcheck**: Automatically monitors container health
- **GraphQL health endpoint**: `GET /api/graphql/health`

### Troubleshooting Docker

**Database connection fails**:
```bash
# Check postgres is healthy
docker compose ps

# Check logs
docker compose logs postgres

# Restart services
docker compose restart
```

**Migrations not running**:
```bash
# Run migrations manually
docker compose exec app pnpm drizzle-kit migrate
```

**Port already in use**:
```bash
# Change ports in docker-compose.yaml
ports:
  - "3001:3000"  # Map to different host port
```

## Configuration

### Nitro Config

```typescript
import graphql from 'nitro-graphql'
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  serverDir: './server',
  modules: [
    graphql({
      framework: 'graphql-yoga',
    }),
  ],
})
```

### Drizzle Kit Config

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/drizzle/schema/index.ts',
  out: './server/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.NITRO_BOOK_DATABASE_URL!,
  },
})
```

## Best Practices Demonstrated

1. **Type Safety Chain**: Drizzle schema → Zod validation → GraphQL types
2. **Context-Based Access**: Database and tables provided through GraphQL context (not direct imports)
3. **Explicit Imports**: All resolvers use `import { ... } from 'nitro-graphql/define'`
4. **Input Validation**: Zod schemas validate all mutations before database operations
5. **Error Handling**: Centralized error masking with user-friendly messages
6. **Modular Structure**: Organized by feature (books/) with separate query/mutation folders
7. **Computed Fields**: Type resolvers for fields not stored in database
8. **Reusable Schema Helpers**: Custom timestamp function for consistent date handling
9. **Database Singleton**: Single connection instance shared via context
10. **Environment Variables**: Database credentials in `.env` (not committed)
11. **Migration Management**: Drizzle Kit for schema version control
12. **Docker Deployment**: Production-ready multi-stage Dockerfile with PostgreSQL

## Common Issues

### "defineQuery is not defined"

**Solution**: Add explicit import to your resolver file:
```typescript
import { defineQuery } from 'nitro-graphql/define'
```

### Database Connection Error

**Check**:
1. PostgreSQL is running
2. `.env` file has correct `NITRO_BOOK_DATABASE_URL`
3. Database exists and is accessible
4. Migrations have been applied: `pnpm db:migrate`

### Validation Errors Not Showing

**Ensure**: `createDefaultMaskError()` is configured in `server/graphql/config.ts`

## Learn More

- [Nitro GraphQL Documentation](https://nitro-graphql.pages.dev)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Drizzle Zod](https://orm.drizzle.team/docs/zod)
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server)

## License

MIT
