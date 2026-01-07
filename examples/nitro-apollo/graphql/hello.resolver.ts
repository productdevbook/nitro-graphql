import { defineQuery } from 'nitro-graphql/define'

export const helloQueries = defineQuery({
  hello: () => 'Hello from Nitro GraphQL with Apollo Server!',
  greeting: (_, { name }) => `Hello, ${name}!`,
})
