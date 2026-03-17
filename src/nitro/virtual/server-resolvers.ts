/**
 * Virtual module: #nitro-graphql/server-resolvers
 * Generates import statements for all discovered resolver files
 */

import type { Nitro } from 'nitro/types'
import { generateImportModule } from './utils'

export const serverResolvers = {
  id: '#nitro-graphql/server-resolvers',
  getCode: (nitro: Nitro): string => {
    // All resolvers (local + manifest) are now in nitro.scanResolvers
    const imports = [...nitro.scanResolvers]

    if (!imports.length) {
      // Return demo resolver when no resolvers found
      if (nitro.options.dev) {
        nitro.logger.warn(`[nitro-graphql] No resolvers found. Using demo resolver. Add .resolver.ts files to ${nitro.graphql.serverDir}`)
      }
      return `export const resolvers = [
  { resolver: { Query: { hello: () => 'Hello from nitro-graphql!' } } }
]`
    }

    return generateImportModule(imports, 'resolvers', 'resolver')
  },
}
