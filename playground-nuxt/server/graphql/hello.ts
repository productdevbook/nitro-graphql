import { defineResolver } from 'nitro-graphql'

export default defineResolver({
  Query: {
    hello: () => 'Hello from Nuxt + GraphQL!',
    greeting: (_parent, { name }) => `Hello, ${name}! Welcome to Nuxt GraphQL.`,
  },
})
