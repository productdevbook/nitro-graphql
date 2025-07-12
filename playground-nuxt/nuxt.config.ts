// TODO: temporary solution
import 'nitro-graphql/types'

export default defineNuxtConfig({
  compatibilityDate: '2024-07-01',
  devtools: { enabled: true },
  modules: [
    'nitro-graphql/nuxt',
  ],
  nitro: {
    modules: ['nitro-graphql'],
    // GraphQL Yoga configuration
    graphql: {
      endpoint: '/api/graphql',
      playground: true,
      cors: {
        origin: '*',
        credentials: true,
      },
      client: {
        enabled: true,
        watchPatterns: [
          'server/graphql/**/*.graphql',
          'server/graphql/**/*.gql',
        ],
      },
    },
  },

})
