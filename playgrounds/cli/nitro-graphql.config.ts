import { defineConfig } from 'nitro-graphql/cli'

export default defineConfig({
  framework: 'graphql-yoga',
  serverDir: './server/graphql',
  clientDir: './graphql',
})
