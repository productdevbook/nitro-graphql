/**
 * Virtual module generators barrel export
 * Each module provides { id, getCode } following Nitro v3 pattern
 *
 * Uses eager snapshot pattern: virtual module code is generated once at
 * registration time and stored as a string. This prevents race conditions
 * where Rolldown reads nitro.scan* arrays while they're being updated
 * by a concurrent rescan.
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
 * Register all virtual modules with Nitro using eager snapshots.
 * Code is generated immediately and captured as a string,
 * so Rolldown always reads a consistent state.
 */
export function registerAllVirtualModules(nitro: Nitro): void {
  nitro.options.virtual ??= {}
  for (const mod of allModules) {
    const code = mod.getCode(nitro)
    nitro.options.virtual[mod.id] = () => code
  }
}

/**
 * Refresh virtual module snapshots after a rescan.
 * Call this after nitro.scan* arrays have been fully updated
 * (including extend results) to re-snapshot the virtual modules.
 */
export function refreshVirtualModules(nitro: Nitro): void {
  if (!nitro.options.virtual) return
  for (const mod of allModules) {
    const code = mod.getCode(nitro)
    nitro.options.virtual[mod.id] = () => code
  }
}
