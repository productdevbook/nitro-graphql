import graphql from 'nitro-graphql'
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  serverDir: './',
  features: {
    websocket: true,
  },
  modules: [
    graphql({
      framework: 'graphql-yoga',
      subscriptions: {
        enabled: true,
        websocket: {
          enabled: true,
        },
      },
    }),
  ],
})
