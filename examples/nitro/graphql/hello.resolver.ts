import { defineQuery } from 'nitro-graphql/define'

export const helloQueries = defineQuery({
  hello: () => 'Hello from Nitro GraphQL!',
  greeting: (_, { name }) => `Hello, ${name}!`,
})
