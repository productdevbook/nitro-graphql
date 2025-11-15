import { eq } from 'drizzle-orm'
import { defineMutation } from 'nitro-graphql/define'
import { book } from '../../../drizzle/schema/book'
import { useDatabase } from '../../../utils/useDb'

export const deleteBookMutation = defineMutation({
  // Delete a book
  deleteBook: async (parent, { id }, context) => {
    const db = useDatabase()

    // First check if book exists
    const existing = await db.select().from(book).where(eq(book.id, id))
    if (!existing.length) {
      throw new Error('Book not found')
    }

    // Delete the book
    await db.delete(book).where(eq(book.id, id))
    return true
  },
})
