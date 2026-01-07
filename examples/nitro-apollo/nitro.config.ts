import { defineConfig } from 'nitro'
import graphql from 'nitro-graphql'

export default defineConfig({
  serverDir: './',
  modules: [
    graphql({
      framework: 'apollo-server',
      serverDir: './',
    }),
  ],
})
