import { eq } from 'drizzle-orm'
import { defineMutation } from 'nitro-graphql/define'
import { book } from '../../../drizzle/schema/book'
import { useDatabase } from '../../../utils/useDb'

export const updateBookMutation = defineMutation({
  // Update an existing book
  updateBook: async (parent, { id, input }, context) => {
    const db = useDatabase()

    // First check if book exists
    const existing = await db.select().from(book).where(eq(book.id, id))
    if (!existing.length) {
      throw new Error('Book not found')
    }

    // Update the book
    const result = await db
      .update(book)
      .set({
        ...input,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(book.id, id))
      .returning()

    return result[0]
  },
})
