import type { SchemaType } from '#graphql/server'
import { z } from 'zod/v4'

export const schemas: SchemaType = {
  Todo: z.object({
    id: z.string(),
  }),
}
