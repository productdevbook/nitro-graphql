import { defineQuery } from 'nitro-graphql/define'

export const pregenQueries = defineQuery({
  pregenTest: () => 'Hello from pregenerated!',
})
