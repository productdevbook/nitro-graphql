import { defineResolver } from 'nitro-graphql/utils/define'

export const helloResolver = defineResolver({
  Query: {
    hello: () => 'Hello from GraphQL!',
    greeting: (_, { name }) => `Hello, ${name}!`,
  },
})
