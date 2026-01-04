import { defineQuery } from 'nitro-graphql/define'

export const extendQueries = defineQuery({
  extendHello: () => 'Hello from extend package!',
})
