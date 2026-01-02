import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import graphql from 'nitro-graphql'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    nitro(),
    graphql({
      framework: 'graphql-yoga',
      scaffold: false,
      serverDir: 'server/graphql',
      clientDir: 'src/graphql',
    }),
    react(),
  ],
  nitro: {
    preset: process.env.NITRO_PRESET || 'node-server',
    serverDir: 'server',
  },
})
