import { pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'
import { v7 as uuidv7 } from 'uuid'
import { customTimestamp } from '../shared'
import { user } from './user'

// Session table - Better Auth core schema
export const session = pgTable('session', {
  id: uuid().primaryKey().$defaultFn(() => uuidv7()),
  token: text().notNull().unique(),
  userId: uuid()
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: customTimestamp().notNull(),
  ipAddress: varchar({ length: 45 }),
  userAgent: text(),
  createdAt: customTimestamp().defaultNow().notNull(),
  updatedAt: customTimestamp().defaultNow().notNull().$onUpdateFn(() => new Date().toISOString()),
})

// Zod schema - auto-generated from Drizzle table
export const selectSessionSchema = createSelectSchema(session)
