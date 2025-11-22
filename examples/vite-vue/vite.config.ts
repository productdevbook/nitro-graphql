import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
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
      paths: {
        serverGraphql: 'server/graphql',
        clientGraphql: 'src/graphql',
      },
    }),
    vue(),
  ],
  nitro: {
    preset: process.env.NITRO_PRESET || 'node-server',
    serverDir: 'server',
  },
})
