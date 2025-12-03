/**
 * Federation support utilities
 * Extracted from graphql-yoga and apollo-server routes to avoid duplication
 */

import type { DocumentNode, GraphQLSchema } from 'graphql'
import { consola } from 'consola'
import { LOG_TAG } from '../constants'

const logger = consola.withTag(LOG_TAG)

/**
 * Type for buildSubgraphSchema function from @apollo/subgraph
 */
type BuildSubgraphSchemaFn = (options: {
  typeDefs: DocumentNode
  resolvers: Record<string, unknown>
}) => GraphQLSchema

/**
 * Cached result: function if available, false if not available, null if not checked yet
 */
let buildSubgraphSchemaCache: BuildSubgraphSchemaFn | false | null = null

/**
 * Dynamically load @apollo/subgraph for federation support.
 * Returns the buildSubgraphSchema function if available, or false if the package is not installed.
 * Result is cached for subsequent calls.
 */
export async function loadFederationSupport(): Promise<BuildSubgraphSchemaFn | false> {
  if (buildSubgraphSchemaCache !== null) {
    return buildSubgraphSchemaCache
  }

  try {
    // Try to import @apollo/subgraph for federation support
    const apolloSubgraph = await import('@apollo/subgraph')
    buildSubgraphSchemaCache = apolloSubgraph.buildSubgraphSchema as BuildSubgraphSchemaFn
  }
  catch {
    // @apollo/subgraph is optional, continue without federation
    buildSubgraphSchemaCache = false
  }

  return buildSubgraphSchemaCache
}

/**
 * Log a warning when federation is enabled but @apollo/subgraph is not available.
 * Uses consola logger instead of console.warn for consistent logging.
 */
export function warnFederationUnavailable(): void {
  logger.warn('Federation enabled but @apollo/subgraph not available, falling back to regular schema')
}

/**
 * Reset the federation support cache.
 * Useful for testing or when the module needs to be reloaded.
 */
export function resetFederationCache(): void {
  buildSubgraphSchemaCache = null
}
