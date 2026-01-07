import { defineConfig } from 'nitro'
import graphql from 'nitro-graphql'

export default defineConfig({
  serverDir: './',
  modules: [
    graphql({
      framework: 'graphql-yoga',
      serverDir: './',
      subscriptions: {
        enabled: true,
        websocket: {
          enabled: true,
        },
      },
    }),
  ],
})
