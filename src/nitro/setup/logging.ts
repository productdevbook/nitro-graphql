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
  const { state } = nitro.graphql
  const externalServicesCount = nitro.options.graphql?.externalServices?.length || 0
  const isProd = process.env.NODE_ENV === 'production'

  if (serverEnabled) {
    const securityConfig = resolveSecurityConfig(nitro.options.graphql?.security)
    const framework = nitro.options.graphql?.framework || 'unknown'

    consola.box({
      title: 'Nitro GraphQL',
      message: [
        `Framework: ${framework}`,
        `Environment: ${isProd ? 'production' : 'development'}`,
        `Schemas: ${state.schemas.length}`,
        `Resolvers: ${state.resolvers.length}`,
        externalServicesCount > 0 ? `External Services: ${externalServicesCount}` : '',
        state.documents.length > 0 ? `Documents: ${state.documents.length}` : '',
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
    consola.box({
      title: 'Nitro GraphQL (Client Only)',
      message: [
        'Server mode: disabled',
        `External Services: ${externalServicesCount}`,
        `Documents: ${state.documents.length}`,
      ].join('\n'),
      style: {
        borderColor: 'blue',
        borderStyle: 'rounded',
      },
    })
  }
}
