import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  srcDir: 'server',
  modules: ['nitro-graphql-yoga'],
  compatibilityDate: '2025-07-01',
  runtimeConfig: {
    graphqlYoga: {
      endpoint: '/api/graphql',
      playground: true,
      cors: {
        origin: '*',
        credentials: true,
      },
    },
  },
})
