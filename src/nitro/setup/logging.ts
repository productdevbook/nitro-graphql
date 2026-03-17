/**
 * Logging and startup info for GraphQL module
 */

import type { Nitro } from 'nitro/types'
import consola from 'consola'
import { resolveSecurityConfig } from './security'

/**
 * Log startup information
 */
export function logStartupInfo(nitro: Nitro, serverEnabled: boolean): void {
  const externalServicesCount = nitro.options.graphql?.externalServices?.length || 0
  const docs = nitro.scanDocuments || []
  const isProd = process.env.NODE_ENV === 'production'

  if (serverEnabled) {
    // Full server mode
    const securityConfig = resolveSecurityConfig(nitro.options.graphql?.security)
    const framework = nitro.options.graphql?.framework || 'unknown'
    const schemas = nitro.scanSchemas?.length || 0
    const resolvers = nitro.scanResolvers?.length || 0

    consola.box({
      title: 'Nitro GraphQL',
      message: [
        `Framework: ${framework}`,
        `Environment: ${isProd ? 'production' : 'development'}`,
        `Schemas: ${schemas}`,
        `Resolvers: ${resolvers}`,
        externalServicesCount > 0 ? `External Services: ${externalServicesCount}` : '',
        docs.length > 0 ? `Documents: ${docs.length}` : '',
        '',
        'Security:',
        `├─ Introspection: ${securityConfig.introspection ? 'enabled' : 'disabled'}`,
        `├─ Playground: ${securityConfig.playground ? 'enabled' : 'disabled'}`,
        `├─ Error Masking: ${securityConfig.maskErrors ? 'enabled' : 'disabled'}`,
        `└─ Field Suggestions: ${securityConfig.disableSuggestions ? 'disabled' : 'enabled'}`,
      ].filter(Boolean).join('\n'),
      style: {
        borderColor: isProd ? 'yellow' : 'cyan',
        borderStyle: 'rounded',
      },
    })
  }
  else {
    // Client-only mode
    consola.box({
      title: 'Nitro GraphQL (Client Only)',
      message: [
        'Server mode: disabled',
        `External Services: ${externalServicesCount}`,
        `Documents: ${docs.length}`,
      ].join('\n'),
      style: {
        borderColor: 'blue',
        borderStyle: 'rounded',
      },
    })
  }
}
