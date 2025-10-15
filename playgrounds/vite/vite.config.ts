import { graphql } from 'nitro-graphql/vite'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    graphql(), // Must be before nitro() to prevent Vite from parsing GraphQL files
    nitro(),
  ],
  nitro: {
    modules: ['nitro-graphql'],
    preset: 'standard',
    graphql: {
      framework: 'graphql-yoga',
    },
  },
})
