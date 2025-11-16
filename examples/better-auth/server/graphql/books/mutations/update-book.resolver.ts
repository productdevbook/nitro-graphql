import { eq } from 'drizzle-orm'
import { HTTPError } from 'h3'
import { defineMutation } from 'nitro-graphql/define'

export const updateBookMutation = defineMutation({
  // Update an existing book (@auth directive ensures user is authenticated)
  updateBook: async (_, { id, input }, { context }) => {
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
      throw new HTTPError('You can only update your own books', {
        status: 403,
      })
    }

    // Update the book
    const result = await database
      .update(tables.book)
      .set({
        ...input,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tables.book.id, id))
      .returning()

    return result[0]
  },
})
