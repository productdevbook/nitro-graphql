import { defineQuery } from 'nitro-graphql/define'

export const helloQueries = defineQuery({
  helloCI: () => 'Hello, world! Test',
})
