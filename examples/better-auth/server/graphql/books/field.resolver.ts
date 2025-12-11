import { eq } from 'drizzle-orm'
import { defineField } from 'nitro-graphql/define'
import { HTTPError } from 'nitro/h3'

export const field = defineField({
  Book: {
    isAvailable: (parent, args, { context }) => {
      // A book is considered available if it was published within the last 5 years
      const currentYear = new Date().getFullYear()
      return parent.publishedYear !== null && currentYear - Number.parseInt(parent.publishedYear) <= 5
    },
    owner: async (parent, args, { context }) => {
      // Fetch the user who owns this book
      const { database, tables } = context
      const [owner] = await database
        .select()
        .from(tables.user)
        .where(eq(tables.user.id, parent.userId))

      if (!owner) {
        throw new HTTPError('Book owner not found', {
          status: 404,
        })
      }

      return owner
    },
  },
})
