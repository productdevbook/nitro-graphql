import graphql from 'nitro-graphql'
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  serverDir: './',

  modules: [
    graphql({
      framework: 'graphql-yoga',
      extend: ['@playground/cli-graphql', './generated'],
    }),
  ],
})
