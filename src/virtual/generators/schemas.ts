/**
 * Virtual module generator for #nitro-graphql/server-schemas
 * Generates code that imports and exports all GraphQL schema files
 */

import type { Nitro } from 'nitro/types'
import { getImportId } from '../../utils'

/**
 * Get all schemas from scanned files and config
 */
function getSchemas(nitro: Nitro): string[] {
  return [
    ...nitro.scanSchemas,
    ...(nitro.options.graphql?.typedefs ?? []),
  ]
}

/**
 * Generate virtual module code for server schemas
 */
export function generateSchemasModule(nitro: Nitro): string {
  try {
    const imports = getSchemas(nitro)

    if (imports.length === 0) {
      if (nitro.options.dev) {
        nitro.logger.warn('[nitro-graphql] No schemas found. Virtual module will export empty array.')
      }
      return 'export const schemas = []'
    }

    const importStatements = imports.map(handler => `import ${getImportId(handler)} from '${handler}';`)
    const schemaArray = imports.map(h => `{ def: ${getImportId(h)} }`)

    const code = /* js */`
${importStatements.join('\n')}

export const schemas = [
${schemaArray.join(',\n')}
];
    `

    return code
  }
  catch (error) {
    nitro.logger.error('[nitro-graphql] Failed to generate virtual schema module:', error)
    return 'export const schemas = []'
  }
}

/**
 * Register the schemas virtual module with Nitro
 */
export function virtualSchemas(nitro: Nitro): void {
  nitro.options.virtual ??= {}
  nitro.options.virtual['#nitro-graphql/server-schemas'] = () => generateSchemasModule(nitro)
}
