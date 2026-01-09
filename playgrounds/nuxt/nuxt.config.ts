import graphql from 'nitro-graphql'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  nitro: {
    modules: [
      graphql({
        framework: 'graphql-yoga',
        // extend: [
        //   '@playground/cli-graphql',
        //   './generated',
        // ], // Disabled - causes duplicate types
      }),
    ],
  },
})
