import graphql from 'nitro-graphql'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  plugins: [
    graphql({
      framework: 'graphql-yoga',
      paths: {
        serverGraphql: 'server/graphql',
      },
      subscriptions: {
        enabled: true,
        protocol: 'graphql-ws',
      },
    }),
    nitro(),
  ],
  nitro: {
    preset: 'standard',
    serverDir: './server',
  },
}))
