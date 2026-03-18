/**
 * Virtual module: #nitro-graphql/server-schemas
 * Collects and inlines all GraphQL schema files
 */

import type { Nitro } from 'nitro/types'
import { readFileSync } from 'node:fs'

export const serverSchemas = {
  id: '#nitro-graphql/server-schemas',
  getCode: (nitro: Nitro): string => {
    const { state } = nitro.graphql
    const schemas = [...state.schemas, ...(nitro.options.graphql?.typedefs ?? [])]
    const directiveSchemas = state.directiveSchemas

    if (!schemas.length && !directiveSchemas) {
      // Return demo schema when no schemas found
      if (nitro.options.dev) {
        nitro.logger.warn(`[nitro-graphql] No schemas found. Using demo schema. Add .graphql files to ${nitro.graphql.serverDir}`)
      }
      return `export const schemas = [
  { def: \`type Query {
  hello: String!
}
\` }
]`
    }

    // Inline schema contents directly to avoid runtime .graphql import issues
    const schemaArray: string[] = schemas.map((schemaPath) => {
      try {
        const content = readFileSync(schemaPath, 'utf-8')
        return `{ def: ${JSON.stringify(content)} }`
      }
      catch {
        // Fallback to import if file can't be read (shouldn't happen)
        return `{ def: '' }`
      }
    })

    // Add inline directive schemas if present
    if (directiveSchemas) {
      schemaArray.push(`{ def: ${JSON.stringify(directiveSchemas)} }`)
    }

    return `export const schemas = [\n${schemaArray.join(',\n')}\n];`
  },
}
