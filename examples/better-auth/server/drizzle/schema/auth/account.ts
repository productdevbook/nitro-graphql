import { pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core'
import { createSelectSchema } from 'drizzle-zod'
import { v7 as uuidv7 } from 'uuid'
import { customTimestamp } from '../shared'
import { user } from './user'

// Account table - Better Auth core schema for OAuth providers
export const account = pgTable('account', {
  id: uuid().primaryKey().$defaultFn(() => uuidv7()),
  userId: uuid()
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: varchar({ length: 255 }).notNull(),
  providerId: varchar({ length: 255 }).notNull(),
  accessToken: text(),
  refreshToken: text(),
  accessTokenExpiresAt: customTimestamp(),
  refreshTokenExpiresAt: customTimestamp(),
  scope: text(),
  idToken: text(),
  password: text(),
  createdAt: customTimestamp().defaultNow().notNull(),
  updatedAt: customTimestamp().defaultNow().notNull().$onUpdateFn(() => new Date().toISOString()),
})

// Zod schema - auto-generated from Drizzle table
export const selectAccountSchema = createSelectSchema(account)
