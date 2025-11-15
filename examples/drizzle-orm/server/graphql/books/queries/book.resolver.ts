import { eq } from 'drizzle-orm'
import { defineQuery } from 'nitro-graphql/define'
import { book } from '../../../drizzle/schema/book'
import { useDatabase } from '../../../utils/useDb'

export const bookQuery = defineQuery({
  // Get a single book by ID
  book: async (parent, { id }, context) => {
    const db = useDatabase()
    const result = await db.select().from(book).where(eq(book.id, id))
    return result[0] || null
  },
})
