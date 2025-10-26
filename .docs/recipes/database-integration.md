# Database Integration

Complete guide to integrating databases with Nitro GraphQL using Prisma, Drizzle ORM, Mongoose, and other popular solutions.

## Overview

This recipe covers:
- Prisma setup and best practices
- Drizzle ORM integration
- Mongoose for MongoDB
- Database connection management
- Migrations and seeding
- Database pooling and performance
- Testing with databases

## Prisma Integration

### 1. Installation

```bash
pnpm add prisma @prisma/client
pnpm add -D @types/node
```

### 2. Initialize Prisma

```bash
npx prisma init
```

This creates:
- `prisma/schema.prisma` - Database schema
- `.env` - Environment variables

### 3. Configure Database

Update `.env`:

```env
# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# MySQL
DATABASE_URL="mysql://user:password@localhost:3306/mydb"

# SQLite (for development)
DATABASE_URL="file:./dev.db"
```

### 4. Define Schema

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql" // or "mysql", "sqlite", "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  // Generate to custom location for monorepos
  // output = "../node_modules/.prisma/client"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String?
  role      Role     @default(USER)
  profile   Profile?
  posts     Post[]
  comments  Comment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
  @@index([role])
}

enum Role {
  USER
  MODERATOR
  ADMIN
  SUPER_ADMIN
}

model Profile {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  bio       String?
  avatar    String?
  website   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id         String    @id @default(cuid())
  title      String
  content    String?
  published  Boolean   @default(false)
  authorId   String
  author     User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  comments   Comment[]
  tags       Tag[]
  viewCount  Int       @default(0)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  publishedAt DateTime?

  @@index([authorId])
  @@index([published])
  @@index([createdAt])
}

model Comment {
  id        String   @id @default(cuid())
  content   String
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([postId])
  @@index([authorId])
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  posts Post[]

  @@index([name])
}
```

### 5. Create Database Client

Create `server/utils/database.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

// Prevent multiple instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
  errorFormat: 'minimal',
})

// Store in global to prevent hot-reload issues
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Graceful shutdown
if (process.env.NODE_ENV === 'production') {
  process.on('SIGINT', async () => {
    await db.$disconnect()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await db.$disconnect()
    process.exit(0)
  })
}

// Helper: Retry connection
export async function connectWithRetry(maxRetries = 5, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await db.$connect()
      console.log('✅ Database connected')
      return
    }
    catch (error) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, error)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }
  throw new Error('Failed to connect to database after retries')
}
```

### 6. Run Migrations

```bash
# Create migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# View database in browser
npx prisma studio
```

### 7. Prisma in Context

Update `server/graphql/context.ts`:

```typescript
import type { PrismaClient } from '@prisma/client'
import { db } from '../utils/database'

declare module 'h3' {
  interface H3EventContext {
    db: PrismaClient
  }
}

export async function createContext(event: any) {
  return {
    event,
    db,
  }
}
```

### 8. Advanced Prisma Patterns

Create `server/utils/prisma-helpers.ts`:

```typescript
import { Prisma } from '@prisma/client'
import { db } from './database'

// Pagination helper
export async function paginate<T, K extends Prisma.ModelName>(
  model: K,
  args: any,
  pageSize = 20
) {
  const page = Math.max(1, args.page || 1)
  const skip = (page - 1) * pageSize

  const [items, total] = await Promise.all([
    (db[model.toLowerCase()] as any).findMany({
      ...args,
      take: pageSize,
      skip,
    }),
    (db[model.toLowerCase()] as any).count({
      where: args.where,
    }),
  ])

  return {
    items,
    pageInfo: {
      page,
      pageSize,
      total,
      hasNextPage: skip + items.length < total,
      hasPreviousPage: page > 1,
    },
  }
}

// Soft delete helper
export async function softDelete(model: any, id: string) {
  return await model.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

// Bulk operations
export async function bulkCreate<T>(
  model: any,
  data: T[],
  batchSize = 100
) {
  const results = []

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    const result = await model.createMany({
      data: batch,
      skipDuplicates: true,
    })
    results.push(result)
  }

  return results
}

// Transaction helper
export async function withTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return await db.$transaction(callback, {
    maxWait: 5000, // 5 seconds
    timeout: 10000, // 10 seconds
  })
}
```

## Drizzle ORM Integration

### 1. Installation

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

### 2. Configure Drizzle

Create `drizzle.config.ts`:

```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config
```

### 3. Define Schema

Create `server/database/schema.ts`:

```typescript
import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// Enums
export const roleEnum = pgEnum('role', ['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'])

// Tables
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password: text('password'),
  role: roleEnum('role').notNull().default('USER'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, table => ({
  emailIdx: uniqueIndex('email_idx').on(table.email),
  roleIdx: index('role_idx').on(table.role),
}))

export const posts = pgTable('posts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  content: text('content'),
  published: boolean('published').notNull().default(false),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  publishedAt: timestamp('published_at'),
}, table => ({
  authorIdx: index('author_idx').on(table.authorId),
  publishedIdx: index('published_idx').on(table.published),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}))

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  bio: text('bio'),
  avatar: text('avatar'),
  website: text('website'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  posts: many(posts),
}))

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}))

// Export types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
```

### 4. Create Database Client

Create `server/utils/drizzle.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

const connectionString = process.env.DATABASE_URL!

// Create postgres client
const queryClient = postgres(connectionString, {
  max: 10, // Connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
})

// Create drizzle instance
export const db = drizzle(queryClient, {
  schema,
  logger: process.env.NODE_ENV === 'development',
})

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 })

// Graceful shutdown
if (process.env.NODE_ENV === 'production') {
  process.on('SIGINT', async () => {
    await queryClient.end()
    process.exit(0)
  })
}

export type DbType = typeof db
```

### 5. Run Migrations

```bash
# Generate migrations
npx drizzle-kit generate

# Run migrations
npx drizzle-kit migrate

# Open Drizzle Studio
npx drizzle-kit studio
```

### 6. Drizzle Query Examples

Create `server/graphql/users/drizzle.resolver.ts`:

```typescript
import { and, desc, eq, like, or } from 'drizzle-orm'
import { posts, users } from '../../database/schema'
import { db } from '../../utils/drizzle'

export const drizzleUserResolvers = defineResolver({
  Query: {
    users: async () => {
      return await db.query.users.findMany({
        with: {
          profile: true,
          posts: {
            limit: 5,
            orderBy: [desc(posts.createdAt)],
          },
        },
        orderBy: [desc(users.createdAt)],
      })
    },

    user: async (_parent, { id }) => {
      return await db.query.users.findFirst({
        where: eq(users.id, id),
        with: {
          profile: true,
          posts: true,
        },
      })
    },

    searchUsers: async (_parent, { query }) => {
      return await db
        .select()
        .from(users)
        .where(
          or(
            like(users.name, `%${query}%`),
            like(users.email, `%${query}%`)
          )
        )
        .limit(20)
    },
  },

  Mutation: {
    createUser: async (_parent, { input }) => {
      const [user] = await db
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
        })
        .returning()

      return user
    },

    updateUser: async (_parent, { id, input }) => {
      const [user] = await db
        .update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning()

      return user
    },

    deleteUser: async (_parent, { id }) => {
      await db.delete(users).where(eq(users.id, id))
      return true
    },
  },
})
```

## Mongoose Integration (MongoDB)

### 1. Installation

```bash
pnpm add mongoose
```

### 2. Create Connection

Create `server/utils/mongoose.ts`:

```typescript
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydb'

let isConnected = false

export async function connectMongoDB() {
  if (isConnected) {
    return
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    })

    isConnected = true
    console.log('✅ MongoDB connected')

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error)
    })

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected')
      isConnected = false
    })
  }
  catch (error) {
    console.error('❌ MongoDB connection failed:', error)
    throw error
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close()
  process.exit(0)
})
```

### 3. Define Models

Create `server/models/User.ts`:

```typescript
import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  email: string
  name: string
  password?: string
  role: 'USER' | 'ADMIN'
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      select: false, // Don't include by default
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN'],
      default: 'USER',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes
UserSchema.index({ email: 1 })
UserSchema.index({ createdAt: -1 })

// Virtuals
UserSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'authorId',
})

export const User = mongoose.model<IUser>('User', UserSchema)
```

Create `server/models/Post.ts`:

```typescript
import mongoose, { Document, Schema, Types } from 'mongoose'

export interface IPost extends Document {
  title: string
  content?: string
  published: boolean
  authorId: Types.ObjectId
  viewCount: number
  createdAt: Date
  updatedAt: Date
}

const PostSchema = new Schema<IPost>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
    },
    published: {
      type: Boolean,
      default: false,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
PostSchema.index({ authorId: 1 })
PostSchema.index({ published: 1, createdAt: -1 })

export const Post = mongoose.model<IPost>('Post', PostSchema)
```

### 4. Mongoose Resolvers

Create `server/graphql/users/mongoose.resolver.ts`:

```typescript
import { Post } from '../../models/Post'
import { User } from '../../models/User'
import { connectMongoDB } from '../../utils/mongoose'

export const mongooseUserResolvers = defineResolver({
  Query: {
    users: async () => {
      await connectMongoDB()
      return await User.find().sort({ createdAt: -1 }).limit(100)
    },

    user: async (_parent, { id }) => {
      await connectMongoDB()
      return await User.findById(id).populate('posts')
    },
  },

  Mutation: {
    createUser: async (_parent, { input }) => {
      await connectMongoDB()
      const user = new User(input)
      await user.save()
      return user
    },

    updateUser: async (_parent, { id, input }) => {
      await connectMongoDB()
      return await User.findByIdAndUpdate(
        id,
        { $set: input },
        { new: true, runValidators: true }
      )
    },

    deleteUser: async (_parent, { id }) => {
      await connectMongoDB()
      await User.findByIdAndDelete(id)
      // Also delete user's posts
      await Post.deleteMany({ authorId: id })
      return true
    },
  },

  User: {
    posts: async (parent) => {
      return await Post.find({ authorId: parent._id }).sort({ createdAt: -1 })
    },
  },
})
```

## Database Seeding

Create `server/database/seed.ts`:

```typescript
import { hashPassword } from '../utils/auth'
import { db } from '../utils/database'

async function seed() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  await db.comment.deleteMany()
  await db.post.deleteMany()
  await db.profile.deleteMany()
  await db.user.deleteMany()

  // Create users
  const users = await Promise.all([
    db.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        password: await hashPassword('admin123'),
        role: 'ADMIN',
        profile: {
          create: {
            bio: 'System administrator',
            avatar: 'https://i.pravatar.cc/150?img=1',
          },
        },
      },
    }),
    db.user.create({
      data: {
        email: 'user@example.com',
        name: 'Regular User',
        password: await hashPassword('user123'),
        role: 'USER',
        profile: {
          create: {
            bio: 'Just a regular user',
            avatar: 'https://i.pravatar.cc/150?img=2',
          },
        },
      },
    }),
  ])

  // Create posts
  const posts = await Promise.all([
    db.post.create({
      data: {
        title: 'Getting Started with Nitro GraphQL',
        content: 'This is a comprehensive guide...',
        published: true,
        authorId: users[0].id,
        publishedAt: new Date(),
      },
    }),
    db.post.create({
      data: {
        title: 'Advanced GraphQL Patterns',
        content: 'Learn about advanced patterns...',
        published: true,
        authorId: users[0].id,
        publishedAt: new Date(),
      },
    }),
    db.post.create({
      data: {
        title: 'Draft Post',
        content: 'This is a draft...',
        published: false,
        authorId: users[1].id,
      },
    }),
  ])

  console.log('✅ Seeded:', {
    users: users.length,
    posts: posts.length,
  })
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
```

Run seed:

```bash
tsx server/database/seed.ts
```

## Database Performance

### 1. Connection Pooling

```typescript
// Prisma
const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool is managed automatically
})

// Drizzle with postgres.js
const client = postgres(DATABASE_URL, {
  max: 10, // Pool size
  idle_timeout: 20,
  connect_timeout: 10,
})
```

### 2. Query Optimization

```typescript
// Select only needed fields
const users = await db.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    // Don't select password
  },
})

// Use proper indexes
// Add to Prisma schema:
// @@index([email])
// @@index([createdAt])

// Batch queries
const [users, posts] = await Promise.all([
  db.user.findMany(),
  db.post.findMany(),
])
```

### 3. Caching with Redis

See [Caching Strategies recipe](./caching-strategies.md) for detailed caching patterns.

## Testing with Databases

Create `server/graphql/__tests__/setup.ts`:

```typescript
import { afterAll, beforeAll, beforeEach } from 'vitest'
import { db } from '../utils/database'

beforeAll(async () => {
  // Connect to test database
  await db.$connect()
})

afterAll(async () => {
  // Disconnect after tests
  await db.$disconnect()
})

beforeEach(async () => {
  // Clean database before each test
  await db.post.deleteMany()
  await db.user.deleteMany()
})
```

## Best Practices

### 1. Use Transactions

```typescript
await db.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData })
  await tx.profile.create({ data: { ...profileData, userId: user.id } })
  return user
})
```

### 2. Handle Connection Errors

```typescript
try {
  await db.$connect()
}
catch (error) {
  console.error('Database connection failed:', error)
  // Implement retry logic or graceful degradation
}
```

### 3. Use Migrations

Always use migrations instead of schema push in production:

```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy
```

### 4. Monitor Query Performance

```typescript
const db = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
  ],
})

db.$on('query', (e) => {
  console.log(`Query: ${e.query}`)
  console.log(`Duration: ${e.duration}ms`)
})
```

## Related Recipes

- [CRUD Operations](./crud-operations.md) - Building CRUD with databases
- [Caching Strategies](./caching-strategies.md) - Improving database performance
- [Testing](../guide/testing.md) - Testing database interactions

## Playground Example

See database usage in:
- Prisma example: `playgrounds/nuxt/server/utils/database.ts`
- Data layer: `playgrounds/nuxt/server/graphql/data/index.ts`
