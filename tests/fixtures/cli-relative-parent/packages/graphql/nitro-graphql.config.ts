import { defineConfig } from 'nitro-graphql/config'

export default defineConfig({
  serverDir: './',
  clientDir: '../../apps/ecommerce/app/graphql',
  types: {
    enabled: true,
    client: '../../apps/ecommerce/app/graphql/types/index.d.ts',
  },
})
