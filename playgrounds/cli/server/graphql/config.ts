import { defineGraphQLConfig } from 'nitro-graphql/define'

// Test extend config merge
export default defineGraphQLConfig({
  // This should be merged with local config
  graphiql: {
    title: 'From CLI Extend',
  },
})
