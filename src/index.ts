import type { Nitro } from 'nitro/types'
import { setupNitroGraphQL } from './setup'

export type * from './types'

/**
 * Nitro GraphQL module
 * Can be used via modules array in nitro.config.ts
 */
export default defineNitroModule({
  name: 'nitro-graphql',
  async setup(nitro: Nitro) {
    await setupNitroGraphQL(nitro)
  },
})
