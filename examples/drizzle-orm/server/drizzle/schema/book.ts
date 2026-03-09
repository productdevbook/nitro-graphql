import { pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { v7 as uuidv7 } from 'uuid'
import { customTimestamp } from './shared'

const FOUR_DIGIT_YEAR_RE = /^\d{4}$/

// Book table - Simple example with a single table
export const book = pgTable('book', {
  id: uuid().primaryKey().$defaultFn(uuidv7),

  // Book information
  title: varchar({ length: 255 }).notNull(),
  author: varchar({ length: 255 }).notNull(),
  isbn: varchar({ length: 13 }).unique(),
  description: text(),
  publishedYear: varchar({ length: 4 }),

  // Timestamps
  createdAt: customTimestamp().defaultNow().notNull(),
  updatedAt: customTimestamp().defaultNow().notNull().$onUpdateFn(() => new Date().toISOString()),
})

// Zod schemas - auto-generated from Drizzle table
export const insertBookSchema = createInsertSchema(book, {
  title: schema => schema.min(1, 'Title is required'),
  author: schema => schema.min(1, 'Author is required'),
  isbn: schema => schema.length(13, 'ISBN must be 13 characters').optional(),
  publishedYear: schema => schema.regex(FOUR_DIGIT_YEAR_RE, 'Year must be 4 digits').optional(),
})

export const selectBookSchema = createSelectSchema(book)
