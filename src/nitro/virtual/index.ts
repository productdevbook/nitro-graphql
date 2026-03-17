/**
 * Virtual module generators barrel export
 * Each module provides { id, getCode } following Nitro v3 pattern
 */

import type { Nitro } from 'nitro/types'
import { debugInfo } from './debug-info'
import { graphqlConfig } from './graphql-config'
import { moduleConfig } from './module-config'
import { pubsub } from './pubsub'
import { serverDirectives } from './server-directives'
import { serverResolvers } from './server-resolvers'
import { serverSchemas } from './server-schemas'
import { validationSchemas } from './validation-schemas'

// Re-export individual modules
export { debugInfo } from './debug-info'
export { graphqlConfig } from './graphql-config'
export { moduleConfig } from './module-config'
export { pubsub } from './pubsub'
export { serverDirectives } from './server-directives'
export { serverResolvers } from './server-resolvers'
export { serverSchemas } from './server-schemas'
export { validationSchemas } from './validation-schemas'

// All modules in registration order
const allModules = [
  serverSchemas,
  serverResolvers,
  serverDirectives,
  graphqlConfig,
  moduleConfig,
  validationSchemas,
  pubsub,
  debugInfo,
]

/**
 * Register all virtual modules with Nitro
 */
export function registerAllVirtualModules(nitro: Nitro): void {
  nitro.options.virtual ??= {}
  for (const mod of allModules) {
    nitro.options.virtual[mod.id] = () => mod.getCode(nitro)
  }
}
