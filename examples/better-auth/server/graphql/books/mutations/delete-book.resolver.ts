import { eq } from 'drizzle-orm'
import { HTTPError } from 'h3'
import { defineMutation } from 'nitro-graphql/define'

export const deleteBookMutation = defineMutation({
  // Delete a book (@auth directive ensures user is authenticated)
  deleteBook: async (_, { id }, { context }) => {
    const { database, tables, user } = context

    // First check if book exists
    const existing = await database.select().from(tables.book).where(eq(tables.book.id, id))
    if (!existing.length) {
      throw new HTTPError('Book not found', {
        status: 404,
      })
    }

    // Check ownership
    if (existing[0].userId !== user.id) {
      throw new HTTPError('You can only delete your own books', {
        status: 403,
      })
    }

    // Delete the book
    await database.delete(tables.book).where(eq(tables.book.id, id))
    return true
  },
})
