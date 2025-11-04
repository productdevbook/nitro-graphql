import { defineNitroConfig } from 'nitro/config'
// import 'nitro-graphql' // Import for types

export default defineNitroConfig({
  srcDir: 'server',
  modules: ['nitro-graphql'],
  compatibilityDate: '2025-07-01',
  graphql: {
    framework: 'apollo-server',
  },
  esbuild: {
    options: {
      target: 'esnext',
    },
  },
})
