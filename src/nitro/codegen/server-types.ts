/**
 * Server-side type generation for Nitro
 * Schema loading, merging, validation, and type output
 */

import type { GraphQLSchema } from 'graphql'
import type { Nitro } from 'nitro/types'
import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import consola from 'consola'
import { parse, print } from 'graphql'
import { resolve } from 'pathe'
import {
  generateServerTypesCore,
  validateNoDuplicateTypes,
} from '../../core/codegen'
import { LOG_TAG } from '../../core/constants'
import { loadFederationSupport } from '../../core/schema'
import { writeFile } from '../../core/utils/file-io'
import { getDefaultPaths, getTypesConfig, resolveFilePath, shouldGenerateTypes } from '../paths'

const logger = consola.withTag(LOG_TAG)

/**
 * Build schema with optional federation support
 * Uses @graphql-tools to ensure same graphql instance is used throughout
 */
async function buildSchemaFromString(source: string, federation: boolean): Promise<GraphQLSchema> {
  if (federation) {
    const buildSubgraph = await loadFederationSupport()
    if (!buildSubgraph) {
      throw new Error('Federation enabled but @apollo/subgraph not installed')
    }
    return buildSubgraph([{ typeDefs: parse(source) }])
  }
  // Use makeExecutableSchema from @graphql-tools to ensure same graphql instance
  // This allows printSchemaWithDirectives to work without "different module" errors
  return makeExecutableSchema({ typeDefs: source })
}

/**
 * Generate server-side resolver types
 * Returns the sorted schema string for reuse by client type generation
 */
export async function generateServerTypes(
  nitro: Nitro,
  options: { silent?: boolean } = {},
): Promise<string | undefined> {
  if (!shouldGenerateTypes(nitro))
    return

  const schemas = nitro.scanSchemas || []
  if (!schemas.length) {
    if (!options.silent)
      consola.info('No GraphQL schemas found')
    return
  }

  try {
    // Load and merge schemas
    const loaded = loadFilesSync(schemas)
    const allStrings = loaded.map(s => typeof s === 'string' ? s : s.loc?.source?.body || '')

    // Filter empty schemas while keeping index alignment
    const validSchemas: string[] = []
    const strings: string[] = []
    schemas.forEach((schema, i) => {
      if (allStrings[i]) {
        validSchemas.push(schema)
        strings.push(allStrings[i])
      }
    })

    // Add inline directive schemas (generated from .directive.ts files)
    const directiveSchemas = nitro.graphql.directiveSchemas
    if (directiveSchemas) {
      validSchemas.push('<directives>')
      strings.push(directiveSchemas)
    }

    if (!validateNoDuplicateTypes(validSchemas, strings))
      return

    // mergeTypeDefs with sort: true provides deterministic ordering
    const merged = mergeTypeDefs([strings.join('\n\n')], { throwOnConflict: true, sort: true })
    // print(merged) preserves directives from the merged DocumentNode
    const mergedSchemaString = print(merged)
    const federation = nitro.options.graphql?.federation?.enabled === true
    const schema = await buildSchemaFromString(mergedSchemaString, federation)

    // Use printSchemaWithDirectives to preserve custom directives in the output
    // Note: We skip lexicographicSortSchema because it causes graphql instance mismatch errors
    // The schema is already sorted by mergeTypeDefs with sort: true
    const sortedSchemaString = printSchemaWithDirectives(schema)

    // Generate types - pass schemaString to avoid graphql instance mismatch
    const result = await generateServerTypesCore({
      framework: nitro.options.graphql?.framework || 'graphql-yoga',
      schemaString: sortedSchemaString,
      config: nitro.options.graphql?.codegen?.server,
      federationEnabled: federation,
    })

    // Write schema.graphql
    const schemaPath = resolve(nitro.graphql.buildDir, 'schema.graphql')
    writeFile(schemaPath, sortedSchemaString)

    // Write server types
    const placeholders = getDefaultPaths(nitro)
    const typesConfig = getTypesConfig(nitro)
    const typesPath = resolveFilePath(typesConfig.server, typesConfig.enabled, true, '{typesDir}/nitro-graphql-server.d.ts', placeholders)

    if (typesPath) {
      writeFile(typesPath, result.types)
      if (!options.silent)
        logger.success(`Server types: ${typesPath}`)
    }

    return sortedSchemaString
  }
  catch (error) {
    logger.error('Server type generation failed:', error)
  }
}
