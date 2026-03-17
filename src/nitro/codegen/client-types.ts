/**
 * Client-side type generation for Nitro
 * Main service client types and SDK generation
 */

import type { Nitro } from 'nitro/types'
import { existsSync, readFileSync } from 'node:fs'
import consola from 'consola'
import { join } from 'pathe'
import {
  generateClientTypesCore,
  generateSubscriptionBuilder,
  loadGraphQLDocuments,
} from '../../core/codegen'
import { LOG_TAG } from '../../core/constants'
import { writeFile } from '../../core/utils/file-io'
import { subscribeClientTemplate } from '../../core/utils/subscribe-templates'
import { getDefaultPaths, getSdkConfig, getTypesConfig, resolveFilePath } from '../paths'
import { generateExternalTypes } from './external-types'

const logger = consola.withTag(LOG_TAG)

/**
 * Generate client-side operation types
 * @param schemaString - Pre-computed schema string from generateServerTypes to avoid disk round-trip
 */
export async function generateClientTypes(
  nitro: Nitro,
  options: { silent?: boolean, isInitial?: boolean } = {},
  schemaString?: string,
): Promise<void> {
  try {
    // Main service types
    if (nitro.graphql.state.schemas.length) {
      await generateMainClientTypes(nitro, options, schemaString)
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
  cachedSchemaString?: string,
): Promise<void> {
  // Use cached schema string if available, otherwise read from disk
  let schemaString = cachedSchemaString
  if (!schemaString) {
    const schemaPath = join(nitro.graphql.buildDir, 'schema.graphql')
    if (!existsSync(schemaPath)) {
      if (!options.silent)
        consola.info('Schema not ready for client types')
      return
    }
    schemaString = readFileSync(schemaPath, 'utf-8')
  }

  const docs = await loadGraphQLDocuments([...nitro.graphql.state.documents])

  // Merge server scalars into client config if client scalars not explicitly set
  // This ensures custom scalars defined for server types are also available for client types
  const serverScalars = nitro.options.graphql?.codegen?.server?.scalars
  const clientConfig = nitro.options.graphql?.codegen?.client || {}
  const resolvedClientConfig = {
    ...clientConfig,
    scalars: clientConfig.scalars ?? serverScalars,
  }

  const types = await generateClientTypesCore({
    schemaString,
    documents: docs,
    config: resolvedClientConfig,
    sdkConfig: nitro.options.graphql?.codegen?.clientSDK,
    options,
  })

  if (types === false) {
    return
  }

  const placeholders = getDefaultPaths(nitro)
  const typesConfig = getTypesConfig(nitro)
  const sdkFileConfig = getSdkConfig(nitro)
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
  const sdkPath = resolveFilePath(sdkFileConfig.main, sdkFileConfig.enabled, true, '{clientDir}/default/sdk.ts', placeholders)
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
