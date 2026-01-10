import { defineQuery } from 'nitro-graphql/define'

export const helloQueries = defineQuery({
  hello: () => 'Hello World!',
  greeting: (_: unknown, { name }: { name: string }) => `Hello ${name}!`,
})
