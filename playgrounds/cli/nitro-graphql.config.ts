import { defineConfig } from 'nitro-graphql/config'

export default defineConfig({
  framework: 'graphql-yoga',
  serverDir: './server/graphql',
  clientDir: './graphql',
})
