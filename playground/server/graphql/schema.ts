import { z } from 'zod'

export default defineSchema({
  Todo: z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean(),
    createdAt: z.date(),
  }),
  User: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().min(0),
  }),
})
