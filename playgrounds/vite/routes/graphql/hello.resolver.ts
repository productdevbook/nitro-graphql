import { defineQuery } from 'nitro-graphql/define'

export const helloResolver = defineQuery({
  hello: () => 'Hello from Vite + Nitro!',
  greeting: (_, { name }) => `Hello, ${name}!`,
})
