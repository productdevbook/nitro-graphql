import { defineNitroConfig } from 'nitropack/config'
// import 'nitro-graphql' // Import for types

export default defineNitroConfig({
  srcDir: 'server',
  modules: ['nitro-graphql'],
  compatibilityDate: '2025-07-01',
  graphql: {
    framework: 'graphql-yoga',
    subscriptions: {
      enabled: true,
    },
  },
  esbuild: {
    options: {
      target: 'esnext',
    },
  },
})
