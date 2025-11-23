/**
 * Client-side type generation for main GraphQL service
 * Generates types from client queries and mutations
 */

import type { Nitro } from 'nitro/types'
import type { ExternalGraphQLService } from '../types'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import consola from 'consola'
import { buildSchema, parse } from 'graphql'
import { dirname, join, resolve } from 'pathe'
import { FILE_INDEX_TS, LOG_TAG, SERVICE_DEFAULT } from '../constants'
import { generateClientTypes as generateClientTypesUtil, loadGraphQLDocuments } from '../utils/client-codegen'
import { writeFileIfNotExists } from '../utils/file-generator'
import {
  getClientUtilsConfig,
  getDefaultPaths,
  getSdkConfig,
  getTypesConfig,
  resolveFilePath,
  shouldGenerateClientUtils,
} from '../utils/path-resolver'

const logger = consola.withTag(LOG_TAG)

/**
 * Load federation support for client-side schema building
 */
async function loadFederationSupport() {
  try {
    const apolloSubgraph = await import('@apollo/subgraph')
    return apolloSubgraph.buildSubgraphSchema
  }
  catch {
    return false
  }
}

/**
 * Check for old structure files and warn user about manual migration
 */
function warnLegacyGraphQLStructure(clientDir: string): void {
  const oldOfetchPath = resolve(clientDir, 'ofetch.ts')
  const oldSdkPath = resolve(clientDir, 'sdk.ts')

  if (existsSync(oldOfetchPath) || existsSync(oldSdkPath)) {
    const foundFiles = []
    if (existsSync(oldOfetchPath))
      foundFiles.push('app/graphql/ofetch.ts')
    if (existsSync(oldSdkPath))
      foundFiles.push('app/graphql/sdk.ts')

    consola.error(`⚠️  OLD GRAPHQL STRUCTURE DETECTED!

📁 Found old files in app/graphql/ directory that need to be moved:
   • ${foundFiles.join('\n   • ')}

🔄 Please manually move these files to the new structure:
   • app/graphql/ofetch.ts → app/graphql/default/ofetch.ts
   • app/graphql/sdk.ts → app/graphql/default/sdk.ts

📝 Also update your app/graphql/index.ts to include:
   export * from './default/ofetch'

💡 After moving, update your imports to use:
   import { $sdk } from "#graphql/client"

🚫 The old files will cause import conflicts until moved!`)
  }
}

/**
 * Generate main client types (for the default service)
 */
export async function generateMainClientTypes(
  nitro: Nitro,
  options: { silent?: boolean, isInitial?: boolean } = {},
): Promise<void> {
  // Check for old structure files and warn user
  warnLegacyGraphQLStructure(nitro.graphql.clientDir)

  const docs = nitro.scanDocuments
  const loadedDocs = await loadGraphQLDocuments(docs)

  const schemaFilePath = join(nitro.graphql.buildDir, 'schema.graphql')
  if (!existsSync(schemaFilePath)) {
    if (!options.silent) {
      consola.info('Schema file not ready yet for client type generation. Server types need to be generated first.')
    }
    return
  }

  const graphqlString = readFileSync(schemaFilePath, 'utf-8')
  const federationEnabled = nitro.options.graphql?.federation?.enabled === true

  let schema
  if (federationEnabled) {
    const buildSubgraph = await loadFederationSupport()
    if (!buildSubgraph) {
      throw new Error('Federation is enabled but @apollo/subgraph is not installed. Run: pnpm add @apollo/subgraph')
    }
    schema = buildSubgraph([{
      typeDefs: parse(graphqlString),
    }])
  }
  else {
    schema = buildSchema(graphqlString)
  }

  const types = await generateClientTypesUtil(
    schema,
    loadedDocs,
    nitro.options.graphql?.codegen?.client ?? {},
    nitro.options.graphql?.codegen?.clientSDK ?? {},
    undefined,
    undefined,
    undefined,
    options,
  )

  if (types === false) {
    return
  }

  // Resolve client types path from config
  const placeholders = getDefaultPaths(nitro)
  const typesConfig = getTypesConfig(nitro)
  const sdkConfig = getSdkConfig(nitro)

  // 1. Generate client type definitions
  const clientTypesPath = resolveFilePath(
    typesConfig.client,
    typesConfig.enabled,
    true,
    '{typesDir}/nitro-graphql-client.d.ts',
    placeholders,
  )

  if (clientTypesPath) {
    mkdirSync(dirname(clientTypesPath), { recursive: true })
    writeFileSync(clientTypesPath, types.types, 'utf-8')
    if (!options.silent) {
      logger.success(`Generated client types at: ${clientTypesPath}`)
    }
  }

  // 2. Generate SDK file
  const sdkPath = resolveFilePath(
    sdkConfig.main,
    sdkConfig.enabled,
    true,
    '{clientGraphql}/default/sdk.ts',
    placeholders,
  )

  if (sdkPath) {
    mkdirSync(dirname(sdkPath), { recursive: true })
    writeFileSync(sdkPath, types.sdk, 'utf-8')
    if (!options.silent) {
      logger.success(`Generated SDK at: ${sdkPath}`)
    }
  }

  // Generate ofetch client for all frameworks (only if it doesn't exist)
  generateNuxtOfetchClient(nitro, nitro.graphql.clientDir, SERVICE_DEFAULT)

  // Generate index file if there are external services
  const externalServices = nitro.options.graphql?.externalServices || []
  if (externalServices.length > 0) {
    generateGraphQLIndexFile(nitro, nitro.graphql.clientDir, externalServices)
  }
}

/**
 * Generate GraphQL index file that exports all services
 */
function generateGraphQLIndexFile(
  nitro: Nitro,
  clientDir: string,
  externalServices: ExternalGraphQLService[] = [],
): void {
  // Check if client utils generation is enabled
  if (!shouldGenerateClientUtils(nitro)) {
    return
  }

  const placeholders = getDefaultPaths(nitro)
  const clientUtilsConfig = getClientUtilsConfig(nitro)

  // Resolve index.ts path
  const indexPath = resolveFilePath(
    clientUtilsConfig.index,
    clientUtilsConfig.enabled,
    true,
    `{clientGraphql}/${FILE_INDEX_TS}`,
    placeholders,
  )

  if (!indexPath) {
    return
  }

  // Only create index.ts if it doesn't exist
  if (!existsSync(indexPath)) {
    let indexContent = `// This file is auto-generated once by nitro-graphql for quick start
// You can modify this file according to your needs
//
// Export your main GraphQL service (auto-generated)
export * from './default/ofetch'

// Export external GraphQL services (auto-generated for existing services)
// When you add new external services, don't forget to add their exports here:
// export * from './yourServiceName/ofetch'
`

    // Add exports for external services
    for (const service of externalServices) {
      indexContent += `export * from './${service.name}/ofetch'\n`
    }

    writeFileIfNotExists(indexPath, indexContent, `client ${FILE_INDEX_TS}`)
  }
}

/**
 * Generate ofetch client wrapper for Nuxt/Nitro
 */
function generateNuxtOfetchClient(
  nitro: Nitro,
  clientDir: string,
  serviceName: string = SERVICE_DEFAULT,
): void {
  // Check if client utils generation is enabled
  if (!shouldGenerateClientUtils(nitro)) {
    return
  }

  const placeholders = {
    ...getDefaultPaths(nitro),
    serviceName,
  }
  const clientUtilsConfig = getClientUtilsConfig(nitro)

  // Resolve ofetch.ts path
  const ofetchPath = resolveFilePath(
    clientUtilsConfig.ofetch,
    clientUtilsConfig.enabled,
    true,
    '{clientGraphql}/{serviceName}/ofetch.ts',
    placeholders,
  )

  if (!ofetchPath) {
    return
  }

  // Create service directory if it doesn't exist
  const serviceDir = dirname(ofetchPath)
  if (!existsSync(serviceDir)) {
    mkdirSync(serviceDir, { recursive: true })
  }

  if (existsSync(ofetchPath)) {
    return // Don't overwrite existing files
  }

  const isNuxt = nitro.options.framework?.name === 'nuxt'

  // Different templates for Nuxt vs Nitro
  // Nuxt: Use $fetch and useRequestHeaders (Nuxt composables)
  // Nitro: Use ofetch import (works in all environments)
  const ofetchContent = isNuxt
    ? `// This file is auto-generated once by nitro-graphql for quick start
// You can modify this file according to your needs
import type { Requester } from './sdk'
import { getSdk } from './sdk'

export function createGraphQLClient(endpoint: string): Requester {
  return async <R>(doc: string, vars?: any): Promise<R> => {
    const headers = import.meta.server ? useRequestHeaders() : undefined

    const result = await $fetch(endpoint, {
      method: 'POST',
      body: { query: doc, variables: vars },
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    })

    return result as R
  }
}

export const $sdk = getSdk(createGraphQLClient('/api/graphql'))`
    : `// This file is auto-generated once by nitro-graphql for quick start
// You can modify this file according to your needs
import type { Requester } from './sdk'
import { ofetch } from 'ofetch'
import { getSdk } from './sdk'

export function createGraphQLClient(endpoint: string): Requester {
  return async <R>(doc: string, vars?: any): Promise<R> => {
    const result = await ofetch(endpoint, {
      method: 'POST',
      body: { query: doc, variables: vars },
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return result as R
  }
}

export const $sdk = getSdk(createGraphQLClient('/api/graphql'))`

  writeFileIfNotExists(ofetchPath, ofetchContent, `${serviceName} ofetch.ts`)
}
