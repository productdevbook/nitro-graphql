export default defineNuxtConfig({
  compatibilityDate: '2024-07-01',
  devtools: { enabled: true },
  // Extend from the example layer to test layer support
  extends: ['./layers/example-layer'],
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
          documents: ['app/graphql/countries/**/*.graphql'],
        },
      ],
    },
  },

})
