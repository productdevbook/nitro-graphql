import { defineMutation } from 'nitro-graphql/define'

export const createBookMutation = defineMutation({
  // Create a new book (@auth directive ensures user is authenticated)
  createBook: async (_, { input }, { context }) => {
    const { database, tables, user } = context

    // Validate input with Zod schema
    const validatedInput = tables.insertBookSchema.parse(input)

    // Auto-assign the userId from authenticated user
    const result = await database
      .insert(tables.book)
      .values({
        ...validatedInput,
        userId: user.id,
      })
      .returning()

    return result[0]
  },
})
