export default defineNuxtConfig({
  compatibilityDate: '2024-07-01',
  devtools: { enabled: true },
  modules: [
    'nitro-graphql/nuxt',
    '@nuxtjs/tailwindcss',
  ],
  nitro: {
    modules: ['nitro-graphql'],
    // GraphQL Yoga configuration
    graphql: {
      framework: 'graphql-yoga',
      // Example external services configuration (commented out by default)
      externalServices: [
        {
          name: 'countries',
          schema: 'https://countries.trevorblades.com',
          endpoint: 'https://countries.trevorblades.com',
          downloadSchema: true,
          documents: ['app/graphql/external/countries/**/*.graphql'],
        },
      ],
    },
  },

})
