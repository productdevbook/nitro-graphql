import { graphql } from 'nitro-graphql/vite'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    graphql(),
    nitro(),
  ],
  nitro: {
    dev: true,
    preset: 'standard',
    modules: ['nitro-graphql'],
    graphql: {
      framework: 'graphql-yoga',
    },
  },
})
