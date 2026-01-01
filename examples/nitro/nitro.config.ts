import { defineConfig } from 'nitro'
import graphql from 'nitro-graphql'

export default defineConfig({
  serverDir: './',
  routesDir: './server/api',
  modules: [
    graphql({
      framework: 'graphql-yoga',
    }),
  ],
})
