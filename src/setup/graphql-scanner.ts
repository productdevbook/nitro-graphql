/**
 * GraphQL file scanner utility
 * Extracted from setup.ts to avoid code duplication
 */

import type { Nitro } from 'nitro/types'
import {
  generateDirectiveSchemas,
  scanDirectives,
  scanDocuments,
  scanResolvers,
  scanSchemas,
} from '../utils'

/**
 * Scan all GraphQL files and update Nitro state
 * Used by both initial setup and dev:start hook
 */
export async function scanAllGraphQLFiles(nitro: Nitro): Promise<void> {
  // Step 1: Scan directives FIRST
  const directives = await scanDirectives(nitro)
  nitro.scanDirectives = directives

  // Step 2: Generate _directives.graphql file and get its path
  if (!nitro.scanSchemas) {
    nitro.scanSchemas = []
  }
  const directivesPath = await generateDirectiveSchemas(nitro, directives)

  // Step 3: Scan schemas from server directory
  const schemas = await scanSchemas(nitro)

  // Step 4: Add generated _directives.graphql to schemas if it exists
  if (directivesPath && !schemas.includes(directivesPath)) {
    schemas.push(directivesPath)
  }
  nitro.scanSchemas = schemas

  // Step 5: Scan documents
  const docs = await scanDocuments(nitro)
  nitro.scanDocuments = docs

  // Step 6: Scan resolvers
  const resolvers = await scanResolvers(nitro)
  nitro.scanResolvers = resolvers
}
