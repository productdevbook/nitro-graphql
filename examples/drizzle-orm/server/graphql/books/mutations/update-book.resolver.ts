import { eq } from 'drizzle-orm'
import { defineMutation } from 'nitro-graphql/define'

export const updateBookMutation = defineMutation({
  // Update an existing book
  updateBook: async (parent, { id, input }, { context }) => {
    const { database, tables } = context

    // First check if book exists
    const existing = await database.select().from(tables.book).where(eq(tables.book.id, id))
    if (!existing.length) {
      throw new Error('Book not found')
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
