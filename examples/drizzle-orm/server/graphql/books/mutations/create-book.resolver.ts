// import { HTTPError } from 'nitro/h3'
import { defineMutation } from 'nitro-graphql/define'

export const createBookMutation = defineMutation({
  // Create a new book
  createBook: async (parent, { input }, { context }) => {
    const { database, tables } = context
    // Example of authentication check (uncomment and implement as needed)
    // throw new HTTPError('Unauthorized', {
    //   statusCode: 401,
    // })

    // Validate input with Zod schema
    const validatedInput = tables.insertBookSchema.parse(input)
    const result = await database.insert(tables.book).values(validatedInput).returning()
    return result[0]
  },
})
