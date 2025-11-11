import { defineQuery } from 'nitro-graphql/define'

export const helloResolver = defineQuery({
  hello: () => 'Hello from Apollo GraphQL!',
  greeting: (_, { name }) => `Hello, ${name}! This is from Apollo Server.`,
})
