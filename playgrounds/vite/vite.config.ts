import { graphql } from 'nitro-graphql/vite'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  plugins: [
    graphql(),
    nitro(),
  ],
  nitro: {
    preset: 'standard',
    modules: ['nitro-graphql'],
    graphql: {
      framework: 'graphql-yoga',
    },
  },
}))
