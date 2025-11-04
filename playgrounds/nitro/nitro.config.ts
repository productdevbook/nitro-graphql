import { defineNitroConfig } from 'nitro/config'
// import 'nitro-graphql' // Import for types

export default defineNitroConfig({
  modules: ['nitro-graphql'],
  compatibilityDate: '2025-07-01',
  graphql: {
    framework: 'graphql-yoga',
  },
  esbuild: {
    options: {
      target: 'esnext',
    },
  },
})
