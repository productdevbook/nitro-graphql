import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [nitro()],
  nitro: {
    modules: ['nitro-graphql'],
    preset: 'standard',
    graphql: {
      framework: 'graphql-yoga',
    },
  },
})
