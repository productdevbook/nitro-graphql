import { defineSchema } from 'nitro-graphql/define'
import { selectBookSchema } from '../drizzle/schema'

export default defineSchema({
  Book: selectBookSchema,
})
