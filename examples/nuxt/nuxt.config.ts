import graphql from 'nitro-graphql'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  nitro: {
    builder: 'rolldown',
    modules: [
      graphql({
        framework: 'graphql-yoga',
      }),
    ],
  },
})
