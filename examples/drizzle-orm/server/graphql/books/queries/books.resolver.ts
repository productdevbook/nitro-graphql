import { defineQuery } from 'nitro-graphql/define'

export const booksQuery = defineQuery({
  // Get all books
  books: async (parent, args, { context }) => {
    const { database, tables } = context
    return await database.select().from(tables.book)
  },
})
