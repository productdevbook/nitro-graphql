import graphql from 'nitro-graphql'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    graphql({
      framework: 'graphql-yoga',
      serverDir: 'server/graphql',
    }),
    nitro(),
  ],
  nitro: {
    preset: 'standard',
    serverDir: 'server',
  },
})
