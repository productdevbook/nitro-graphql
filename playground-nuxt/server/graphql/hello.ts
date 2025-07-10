import { createResolver } from 'nitro-graphql'

export default createResolver({
  Query: {
    hello: () => 'Hello from Nuxt + GraphQL!',
    greeting: (_parent, { name }) => `Hello, ${name}! Welcome to Nuxt GraphQL.`,
  },
})