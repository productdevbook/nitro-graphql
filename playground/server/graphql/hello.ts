import { createResolver } from 'nitro-graphql'

export default createResolver({
  Query: {
    hello: () => 'Hello from auto-discovered resolver!',
    greeting: (_parent, { name }) => `Hello, ${name}!`,
  },
})
