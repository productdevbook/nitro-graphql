/**
 * Virtual module generators for configuration modules
 * - #nitro-graphql/graphql-config
 * - #nitro-graphql/module-config
 */

import type { Nitro } from 'nitro/types'
import { resolve } from 'pathe'

/**
 * Generate virtual module code for GraphQL config (from server/graphql/config.ts)
 */
export function generateGraphQLConfigModule(nitro: Nitro): string {
  const configPath = resolve(nitro.graphql.serverDir, 'config.ts')

  return `import config from '${configPath}'
const importedConfig = config
export { importedConfig }
`
}

/**
 * Register the GraphQL config virtual module with Nitro
 */
export function virtualGraphQLConfig(nitro: Nitro): void {
  nitro.options.virtual ??= {}
  nitro.options.virtual['#nitro-graphql/graphql-config'] = () => generateGraphQLConfigModule(nitro)
}

/**
 * Generate virtual module code for module config (serialized graphql options)
 */
export function generateModuleConfigModule(nitro: Nitro): string {
  const moduleConfig = nitro.options.graphql || {}
  return `export const moduleConfig = ${JSON.stringify(moduleConfig, null, 2)};`
}

/**
 * Register the module config virtual module with Nitro
 */
export function virtualModuleConfig(nitro: Nitro): void {
  nitro.options.virtual ??= {}
  nitro.options.virtual['#nitro-graphql/module-config'] = () => generateModuleConfigModule(nitro)
}
