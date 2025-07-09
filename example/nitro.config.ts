import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  modules: ['nitro-graphql-yoga'],
  
  runtimeConfig: {
    graphqlYoga: {
      endpoint: '/graphql',
      playground: true,
      cors: {
        origin: '*',
        credentials: true,
      },
    },
  },
})