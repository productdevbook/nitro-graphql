import { defineNitroConfig } from 'nitropack/config'
// import 'nitro-graphql' // Import for types

export default defineNitroConfig({
  srcDir: 'server',
  modules: ['nitro-graphql'],
  compatibilityDate: '2025-07-01',
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
