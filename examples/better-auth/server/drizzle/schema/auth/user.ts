import type { z } from 'zod'
import { boolean, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'
import { v7 as uuidv7 } from 'uuid'
import { customTimestamp } from '../shared'
// User table - Better Auth core schema
export const user = pgTable('user', {
  id: uuid().primaryKey().$defaultFn(() => uuidv7()),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: customTimestamp().defaultNow().notNull(),
  updatedAt: customTimestamp().defaultNow().notNull().$onUpdateFn(() => new Date().toISOString()),
})

// Zod schema - auto-generated from Drizzle table
export const selectUserSchema = createSelectSchema(user)
export type User = z.infer<typeof selectUserSchema>