import { eq } from 'drizzle-orm'
import { defineQuery } from 'nitro-graphql/define'

export const bookQuery = defineQuery({
  // Get a single book by ID
  book: async (parent, { id }, { context }) => {
    const { database, tables } = context
    const result = await database.select().from(tables.book).where(eq(tables.book.id, id))
    return result[0] || null
  },
})
