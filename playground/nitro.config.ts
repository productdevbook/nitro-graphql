import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  srcDir: 'server',
  modules: ['nitro-graphql-yoga'],
  compatibilityDate: '2025-07-01',
  hooks: {
    'nitro:build:before': (nitro) => {
      // Ensure rollupConfig exists
      nitro.options.rollupConfig = nitro.options.rollupConfig || {}
      nitro.options.rollupConfig.output = nitro.options.rollupConfig.output || {}

      // Configure manual chunks for GraphQL files
      nitro.options.rollupConfig.output.manualChunks = (id) => {
        if (id.includes('/graphql/') || id.includes('resolver') || id.includes('createUser') || id.includes('hello') || id.includes('posts') || id.includes('todos') || id.includes('users') || id.includes('comment-resolver')) {
          return 'graphql'
        }
        return undefined
      }

      // Configure chunk file names to use chunk name as directory
      nitro.options.rollupConfig.output.chunkFileNames = (chunkInfo) => {
        const chunkName = chunkInfo.name || 'chunks'
        return `${chunkName}/[name].mjs`
      }
    },
  },
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
