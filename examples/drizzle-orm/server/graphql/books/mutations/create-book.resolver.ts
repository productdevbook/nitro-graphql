// import { HTTPError } from 'h3'
import { defineMutation } from 'nitro-graphql/define'
import { book, insertBookSchema } from '../../../drizzle/schema/book'
import { useDatabase } from '../../../utils/useDb'

export const createBookMutation = defineMutation({
  // Create a new book
  createBook: async (parent, { input }, _event) => {
    const db = useDatabase()
    // Example of authentication check (uncomment and implement as needed)
    // throw new HTTPError('Unauthorized', {
    //   statusCode: 401,
    // })

    // Validate input with Zod schema
    const validatedInput = insertBookSchema.parse(input)
    const result = await db.insert(book).values(validatedInput).returning()
    return result[0]
  },
})
