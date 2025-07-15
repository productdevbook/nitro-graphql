import { z } from 'zod/v4'

export default defineSchema({
  Todo: z.object({
    id: z.string(),
    title: z.string(),
  }),
})
