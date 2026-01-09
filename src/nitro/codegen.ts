/**
 * Nitro GraphQL Type Generation
 * Single, clean codegen module for Nitro ecosystem
 */

import type { GraphQLSchema } from 'graphql'
import type { Nitro } from 'nitro/types'
import { existsSync, readFileSync } from 'node:fs'
import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import consola from 'consola'
import { parse, print } from 'graphql'
import { join, resolve } from 'pathe'
import {
  downloadAndSaveSchema,
  generateClientTypesCore,
  generateExternalClientTypesCore,
  generateServerTypesCore,
  generateSubscriptionBuilder,
  loadExternalSchema,
  loadGraphQLDocuments,
  validateNoDuplicateTypes,
} from '../core/codegen'
import { LOG_TAG } from '../core/constants'
import { loadFederationSupport } from '../core/schema'
import { writeFile } from '../core/utils/file-io'
import { subscribeClientTemplate } from '../core/utils/subscribe-templates'
import { getDefaultPaths, getSdkConfig, getTypesConfig, resolveFilePath, shouldGenerateTypes } from './paths'

const logger = consola.withTag(LOG_TAG)

// Helper: Build schema with optional federation support
// Uses @graphql-tools to ensure same graphql instance is used throughout
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
 */
export async function generateServerTypes(
  nitro: Nitro,
  options: { silent?: boolean } = {},
): Promise<void> {
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
      config: nitro.options.graphql?.codegen?.server as any,
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
  }
  catch (error) {
    logger.error('Server type generation failed:', error)
  }
}

/**
 * Generate client-side operation types
 */
export async function generateClientTypes(
  nitro: Nitro,
  options: { silent?: boolean, isInitial?: boolean } = {},
): Promise<void> {
  try {
    // Main service types
    if (nitro.scanSchemas?.length) {
      await generateMainClientTypes(nitro, options)
    }

    // External service types
    if (nitro.options.graphql?.externalServices?.length) {
      await generateExternalTypes(nitro, options)
    }
  }
  catch (error) {
    logger.error('Client type generation failed:', error)
  }
}

async function generateMainClientTypes(
  nitro: Nitro,
  options: { silent?: boolean, isInitial?: boolean } = {},
): Promise<void> {
  const schemaPath = join(nitro.graphql.buildDir, 'schema.graphql')
  if (!existsSync(schemaPath)) {
    if (!options.silent)
      consola.info('Schema not ready for client types')
    return
  }

  const docs = await loadGraphQLDocuments(nitro.scanDocuments)

  // Read schema as string to avoid graphql instance mismatch
  const schemaString = readFileSync(schemaPath, 'utf-8')

  const types = await generateClientTypesCore({
    schemaString,
    documents: docs,
    config: nitro.options.graphql?.codegen?.client as any,
    sdkConfig: nitro.options.graphql?.codegen?.clientSDK as any,
    options,
  })

  if (types === false)
    return

  const placeholders = getDefaultPaths(nitro)
  const typesConfig = getTypesConfig(nitro)
  const sdkConfig = getSdkConfig(nitro)
  const subscriptionsEnabled = nitro.options.graphql?.subscriptions?.enabled ?? false

  // Write client types
  const clientPath = resolveFilePath(typesConfig.client, typesConfig.enabled, true, '{typesDir}/nitro-graphql-client.d.ts', placeholders)
  if (clientPath) {
    writeFile(clientPath, types.types)
    if (!options.silent)
      logger.success(`Client types: ${clientPath}`)
  }

  // Generate subscription builder code if subscriptions are enabled
  const subscriptionCode = generateSubscriptionBuilder(docs, subscriptionsEnabled)

  // Write SDK (with optional subscription composables appended)
  const sdkPath = resolveFilePath(sdkConfig.main, sdkConfig.enabled, true, '{clientDir}/default/sdk.ts', placeholders)
  if (sdkPath) {
    const sdkContent = subscriptionCode ? types.sdk + subscriptionCode : types.sdk
    writeFile(sdkPath, sdkContent)
    if (!options.silent)
      logger.success(`SDK: ${sdkPath}`)
  }

  // Generate subscribe.ts config file if subscriptions enabled (only if it doesn't exist)
  if (subscriptionsEnabled) {
    const subscribePath = resolveFilePath(true, true, true, '{clientDir}/default/subscribe.ts', placeholders)
    if (subscribePath && !existsSync(subscribePath)) {
      writeFile(subscribePath, subscribeClientTemplate)
      if (!options.silent)
        logger.success(`Subscribe config: ${subscribePath}`)
    }
  }
}

async function generateExternalTypes(
  nitro: Nitro,
  options: { silent?: boolean } = {},
): Promise<void> {
  for (const service of nitro.options.graphql?.externalServices || []) {
    try {
      if (!options.silent)
        consola.info(`[${service.name}] Processing external service`)

      await downloadAndSaveSchema(service as any, nitro.options.buildDir)
      const schema = await loadExternalSchema(service as any, nitro.options.buildDir)
      if (!schema) {
        consola.warn(`[${service.name}] Failed to load schema`)
        continue
      }
      const docs = service.documents?.length
        ? await loadGraphQLDocuments(service.documents).catch(() => [])
        : []

      if (service.documents?.length && !docs.length) {
        consola.warn(`[${service.name}] No documents found`)
        continue
      }

      // Use schema directly without lexicographicSortSchema to avoid graphql instance mismatch
      const types = await generateExternalClientTypesCore(service as any, schema, docs)
      if (types === false)
        continue

      const placeholders = { ...getDefaultPaths(nitro), serviceName: service.name }
      const typesConfig = getTypesConfig(nitro)
      const sdkConfig = getSdkConfig(nitro)

      // Write external types
      const typesPath = resolveFilePath(
        service.paths?.types ?? typesConfig.external,
        typesConfig.enabled,
        true,
        '{typesDir}/nitro-graphql-client-{serviceName}.d.ts',
        placeholders,
      )
      if (typesPath) {
        writeFile(typesPath, types.types)
        if (!options.silent)
          consola.success(`[${service.name}] Types: ${typesPath}`)
      }

      // Write external SDK
      const sdkPath = resolveFilePath(
        service.paths?.sdk ?? sdkConfig.external,
        sdkConfig.enabled,
        true,
        '{clientDir}/{serviceName}/sdk.ts',
        placeholders,
      )
      if (sdkPath) {
        writeFile(sdkPath, types.sdk)
        if (!options.silent)
          consola.success(`[${service.name}] SDK: ${sdkPath}`)
      }
    }
    catch (error) {
      consola.error(`[${service.name}] External service failed:`, error)
    }
  }
}
