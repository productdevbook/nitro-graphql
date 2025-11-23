/**
 * Type generation orchestrator
 * Coordinates server and client type generation
 */

import type { Nitro } from 'nitro/types'
import consola from 'consola'
import { LOG_TAG } from '../constants'
import { generateMainClientTypes } from './client-types'
import { generateExternalServicesTypes } from './external-types'
import { generateServerTypes } from './server-types'

const logger = consola.withTag(LOG_TAG)

/**
 * Generate server-side GraphQL resolver types
 * @deprecated Use generateServerTypes instead
 */
export async function serverTypeGeneration(
  nitro: Nitro,
  options: { silent?: boolean } = {},
): Promise<void> {
  return generateServerTypes(nitro, options)
}

/**
 * Generate client-side GraphQL types (main service + external services)
 * @deprecated Use generateClientTypes instead
 */
export async function clientTypeGeneration(
  nitro: Nitro,
  options: { silent?: boolean, isInitial?: boolean } = {},
): Promise<void> {
  return generateClientTypes(nitro, options)
}

/**
 * Generate client-side GraphQL types
 * Generates types for both main service and external services
 */
export async function generateClientTypes(
  nitro: Nitro,
  options: { silent?: boolean, isInitial?: boolean } = {},
): Promise<void> {
  try {
    // Generate main service types (only if server schema exists)
    const hasServerSchema = nitro.scanSchemas && nitro.scanSchemas.length > 0
    if (hasServerSchema) {
      await generateMainClientTypes(nitro, options)
    }

    // Generate external service types (can work independently)
    if (nitro.options.graphql?.externalServices?.length) {
      await generateExternalServicesTypes(nitro, options)
    }
  }
  catch (error) {
    logger.error('Client schema generation error:', error)
  }
}

export { generateMainClientTypes } from './client-types'
export { generateExternalServicesTypes } from './external-types'
// Re-export individual generators for direct use
export { generateServerTypes } from './server-types'
export { validateNoDuplicateTypes } from './validation'
