/**
 * Server-side type generation
 * Generates GraphQL resolver types for the server
 */

import type { Nitro } from 'nitro/types'
import { mkdirSync, writeFileSync } from 'node:fs'
import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import consola from 'consola'
import { buildSchema, parse } from 'graphql'
import { dirname, resolve } from 'pathe'
import { LOG_TAG } from '../constants'
import { loadFederationSupport } from '../utils/federation'
import { getDefaultPaths, getTypesConfig, resolveFilePath, shouldGenerateTypes } from '../utils/path-resolver'
import { generateTypes } from '../utils/server-codegen'
import { validateNoDuplicateTypes } from './validation'

const logger = consola.withTag(LOG_TAG)

/**
 * Generate server-side GraphQL types
 * Creates resolver types from GraphQL schemas
 */
export async function generateServerTypes(
  nitro: Nitro,
  options: { silent?: boolean } = {},
): Promise<void> {
  try {
    // Check if type generation is enabled
    if (!shouldGenerateTypes(nitro)) {
      logger.debug('Server type generation is disabled')
      return
    }

    const schemas = nitro.scanSchemas || []

    if (!schemas.length) {
      if (!options.silent) {
        consola.info('No GraphQL definitions found for server type generation.')
      }
      return
    }

    const loadedSchemas = loadFilesSync(schemas)
    // Convert to string format similar to route handlers
    const schemaStrings = loadedSchemas.map(schema =>
      typeof schema === 'string' ? schema : schema.loc?.source?.body || '',
    ).filter(Boolean)

    // Validate for duplicate type definitions before merging
    const isValid = validateNoDuplicateTypes(schemas, schemaStrings)
    if (!isValid) {
      return // Exit early if duplicates found
    }

    // Add Federation directives for buildSchema if federation is enabled
    const federationEnabled = nitro.options.graphql?.federation?.enabled === true

    const mergedSchemas = mergeTypeDefs([schemaStrings.join('\n\n')], {
      throwOnConflict: true,
      commentDescriptions: true,
      sort: true,
    })

    let schema
    if (federationEnabled) {
      const buildSubgraph = await loadFederationSupport()
      if (!buildSubgraph) {
        throw new Error('Federation is enabled but @apollo/subgraph is not installed. Run: pnpm add @apollo/subgraph')
      }
      schema = buildSubgraph([{
        typeDefs: parse(mergedSchemas),
      }])
    }
    else {
      schema = buildSchema(mergedSchemas)
    }

    const data = await generateTypes(
      nitro.options.graphql?.framework || 'graphql-yoga',
      schema,
      nitro.options.graphql ?? {},
    )

    const printSchema = printSchemaWithDirectives(schema)

    const schemaPath = resolve(nitro.graphql.buildDir, 'schema.graphql')
    mkdirSync(dirname(schemaPath), { recursive: true })
    writeFileSync(schemaPath, printSchema, 'utf-8')

    // Resolve server types path from config
    const placeholders = getDefaultPaths(nitro)
    const typesConfig = getTypesConfig(nitro)

    const serverTypesPath = resolveFilePath(
      typesConfig.server,
      typesConfig.enabled,
      true,
      '{typesDir}/nitro-graphql-server.d.ts',
      placeholders,
    )

    if (serverTypesPath) {
      mkdirSync(dirname(serverTypesPath), { recursive: true })
      writeFileSync(serverTypesPath, data, 'utf-8')
      if (!options.silent) {
        logger.success(`Generated server types at: ${serverTypesPath}`)
      }
    }
  }
  catch (error) {
    logger.error('Server schema generation error:', error)
  }
}
