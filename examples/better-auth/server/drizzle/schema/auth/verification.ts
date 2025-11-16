import { pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'
import { v7 as uuidv7 } from 'uuid'
import { customTimestamp } from '../shared'

// Verification table - Better Auth core schema for email verification, password reset, etc.
export const verification = pgTable('verification', {
  id: uuid().primaryKey().$defaultFn(() => uuidv7()),
  identifier: varchar({ length: 255 }).notNull(),
  value: text().notNull(),
  expiresAt: customTimestamp().notNull(),
  createdAt: customTimestamp().defaultNow().notNull(),
  updatedAt: customTimestamp().defaultNow().notNull().$onUpdateFn(() => new Date().toISOString()),
})

// Zod schema - auto-generated from Drizzle table
export const selectVerificationSchema = createSelectSchema(verification)
