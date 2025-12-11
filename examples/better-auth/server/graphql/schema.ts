import { defineSchema } from 'nitro-graphql/define'
import z from 'zod'
import {
  selectAccountSchema,
  selectBookSchema,
  selectSessionSchema,
  selectUserSchema,
  selectVerificationSchema,
} from '../drizzle'

export default defineSchema({
  // Auth schemas
  User: selectUserSchema,
  Session: selectSessionSchema,
  Account: selectAccountSchema,
  Verification: selectVerificationSchema,
  // Business logic schemas
  Book: selectBookSchema,
  AuthResponse: z.object({
    user: selectUserSchema,
    session: z.string().nullable(),
  }),
})
