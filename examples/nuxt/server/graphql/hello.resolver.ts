import { defineQuery } from 'nitro-graphql/define'

export const helloQueries = defineQuery({
  hello: () => 'Hello from Nuxt + nitro-graphql!',
  greeting: (_: unknown, { name }: { name: string }) => `Hello ${name}!`,
})
