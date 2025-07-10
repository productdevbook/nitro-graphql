import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  srcDir: 'server',
  modules: ['nitro-graphql'],
  compatibilityDate: '2025-07-01',
  graphqlYoga: {
    endpoint: '/api/graphql',
    playground: true,
    cors: {
      origin: '*',
      credentials: true,
    },
    client: {
      enabled: true,
      watchPatterns: [
        'client/**/*.graphql',
        'client/**/*.gql',
      ],
    },
  },
  esbuild: {
    options: {
      target: 'esnext',
    },
  },
})
