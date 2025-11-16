import { eq } from 'drizzle-orm'
import { defineMutation } from 'nitro-graphql/define'

export const deleteBookMutation = defineMutation({
  // Delete a book
  deleteBook: async (parent, { id }, { context }) => {
    const { database, tables } = context

    // First check if book exists
    const existing = await database.select().from(tables.book).where(eq(tables.book.id, id))
    if (!existing.length) {
      throw new Error('Book not found')
    }

    // Delete the book
    await database.delete(tables.book).where(eq(tables.book.id, id))
    return true
  },
})
