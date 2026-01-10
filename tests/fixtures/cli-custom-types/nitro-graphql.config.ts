import { defineConfig } from 'nitro-graphql/config'

export default defineConfig({
  framework: 'graphql-yoga',
  serverDir: './server/graphql',
  clientDir: './graphql',
  types: {
    enabled: true,
    server: './custom-types/server.d.ts',
    client: './custom-types/client.d.ts',
  },
})
