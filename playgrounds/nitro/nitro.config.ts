import graphql from 'nitro-graphql'
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  modules: [
    graphql({
      framework: 'graphql-yoga',
      // Extend with multiple sources (merge: true is default)
      extend: {
        resolvers: [
          './generated/resolvers', // Local generated
          '@playground/cli-graphql/resolvers', // External package
        ],
        schemas: [
          './generated/schema',
          '@playground/cli-graphql/schema',
        ],
      },
    }),
  ],
})
