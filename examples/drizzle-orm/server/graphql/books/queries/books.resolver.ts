import { defineQuery } from 'nitro-graphql/define'
import { book } from '../../../drizzle/schema/book'
import { useDatabase } from '../../../utils/useDb'

export const booksQuery = defineQuery({
  // Get all books
  books: async (parent, args, context) => {
    const db = useDatabase()
    return await db.select().from(book)
  },
})
