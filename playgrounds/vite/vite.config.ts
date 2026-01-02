import { DevTools } from '@vitejs/devtools'
import graphql from 'nitro-graphql'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  plugins: [
    graphql({
      framework: 'graphql-yoga',
      serverDir: 'routes/graphql',
    }),
    nitro(),
    DevTools(),
  ],
  nitro: {
    preset: 'standard',
  },
  build: {
    rolldownOptions: {
      debug: {}, // enable debug mode
    },
  },
}))
