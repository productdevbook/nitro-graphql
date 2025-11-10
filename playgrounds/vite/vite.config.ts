import graphql from 'nitro-graphql'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  plugins: [
    graphql({
      framework: 'graphql-yoga',
      paths: {
        serverGraphql: 'routes/graphql',
      },
    }),
    nitro(),
  ],
  nitro: {
    preset: 'standard',
  },
}))
