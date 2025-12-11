/**
 * External GraphQL service type generation
 * Generates types for external GraphQL APIs (GitHub, Shopify, etc.)
 */

import type { Nitro } from 'nitro/types'
import type { ExternalGraphQLService } from '../types'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import consola from 'consola'
import { dirname } from 'pathe'
import {
  downloadAndSaveSchema,
  generateExternalClientTypes,
  loadExternalSchema,
  loadGraphQLDocuments,
} from '../utils/client-codegen'
import { writeFileIfNotExists } from '../utils/file-generator'
import { generateOfetchTemplate, generateWebSocketTemplate } from '../utils/ofetch-templates'
import {
  getClientUtilsConfig,
  getDefaultPaths,
  getSdkConfig,
  getTypesConfig,
  resolveFilePath,
  shouldGenerateClientUtils,
} from '../utils/path-resolver'

/**
 * Generate types for all external GraphQL services
 */
export async function generateExternalServicesTypes(
  nitro: Nitro,
  options: { silent?: boolean } = {},
): Promise<void> {
  const externalServices = nitro.options.graphql?.externalServices || []

  for (const service of externalServices) {
    try {
      if (!options.silent) {
        consola.info(`[graphql:${service.name}] Processing external service`)
      }

      // Download and save schema if enabled
      await downloadAndSaveSchema(service, nitro.options.buildDir)

      // Load external schema (will use downloaded schema if available)
      const schema = await loadExternalSchema(service, nitro.options.buildDir)
      if (!schema) {
        consola.warn(`[graphql:${service.name}] Failed to load schema, skipping`)
        continue
      }

      // Load documents for this service
      const documentPatterns = service.documents || []
      let loadedDocs: any[] = []

      if (documentPatterns.length > 0) {
        try {
          loadedDocs = await loadGraphQLDocuments(documentPatterns)
          if (!loadedDocs || loadedDocs.length === 0) {
            consola.warn(`[graphql:${service.name}] No GraphQL documents found, skipping service generation`)
            continue
          }
        }
        catch (error) {
          consola.warn(`[graphql:${service.name}] No documents found, skipping service generation:`, error)
          continue
        }
      }

      // Generate types for external service
      const types = await generateExternalClientTypes(service, schema, loadedDocs)
      if (types === false) {
        consola.warn(`[graphql:${service.name}] Type generation failed`)
        continue
      }

      // Resolve paths from config with service-specific overrides
      const placeholders = {
        ...getDefaultPaths(nitro),
        serviceName: service.name,
      }
      const typesConfig = getTypesConfig(nitro)
      const sdkConfig = getSdkConfig(nitro)

      // Service-specific paths take precedence over global config
      // Priority: service.paths.X > global X.external > default

      // 1. Generate external service type definitions
      const serviceTypesPath = resolveFilePath(
        service.paths?.types ?? typesConfig.external, // Service-specific path first
        typesConfig.enabled,
        true,
        '{typesDir}/nitro-graphql-client-{serviceName}.d.ts',
        placeholders,
      )

      if (serviceTypesPath) {
        mkdirSync(dirname(serviceTypesPath), { recursive: true })
        writeFileSync(serviceTypesPath, types.types, 'utf-8')
        if (!options.silent) {
          consola.success(`[graphql:${service.name}] Generated types at: ${serviceTypesPath}`)
        }
      }

      // 2. Generate external service SDK
      const serviceSdkPath = resolveFilePath(
        service.paths?.sdk ?? sdkConfig.external, // Service-specific path first
        sdkConfig.enabled,
        true,
        '{clientGraphql}/{serviceName}/sdk.ts',
        placeholders,
      )

      if (serviceSdkPath) {
        mkdirSync(dirname(serviceSdkPath), { recursive: true })
        writeFileSync(serviceSdkPath, types.sdk, 'utf-8')
        if (!options.silent) {
          consola.success(`[graphql:${service.name}] Generated SDK at: ${serviceSdkPath}`)
        }
      }

      // Generate ofetch client for all frameworks
      generateExternalOfetchClient(nitro, service, service.endpoint)

      // Generate WebSocket client if wsEndpoint is provided
      if (service.wsEndpoint) {
        generateExternalWebSocketClient(nitro, service, service.wsEndpoint)
        if (!options.silent) {
          consola.success(`[graphql:${service.name}] WebSocket client generated`)
        }
      }

      if (!options.silent) {
        consola.success(`[graphql:${service.name}] External service types generated successfully`)
      }
    }
    catch (error) {
      consola.error(`[graphql:${service.name}] External service generation failed:`, error)
    }
  }
}

/**
 * Generate ofetch client for external service
 */
function generateExternalOfetchClient(
  nitro: Nitro,
  service: ExternalGraphQLService,
  endpoint: string,
): void {
  // Check if client utils generation is enabled
  if (!shouldGenerateClientUtils(nitro)) {
    return
  }

  const serviceName = service.name
  const placeholders = {
    ...getDefaultPaths(nitro),
    serviceName,
  }
  const clientUtilsConfig = getClientUtilsConfig(nitro)

  // Resolve ofetch.ts path with service-specific override
  // Priority: service.paths.ofetch > global clientUtils.ofetch > default
  const ofetchPath = resolveFilePath(
    service.paths?.ofetch ?? clientUtilsConfig.ofetch, // Service-specific path first
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

  // Only create ofetch file if it doesn't exist
  if (!existsSync(ofetchPath)) {
    const isNuxt = nitro.options.framework?.name === 'nuxt'
    const ofetchContent = generateOfetchTemplate({
      serviceName,
      isNuxt,
      endpoint,
      isExternal: true,
    })

    writeFileIfNotExists(ofetchPath, ofetchContent, `${serviceName} external ofetch.ts`)
  }
}

/**
 * Generate WebSocket client for external service
 */
function generateExternalWebSocketClient(
  nitro: Nitro,
  service: ExternalGraphQLService,
  wsEndpoint: string,
): void {
  // Check if client utils generation is enabled
  if (!shouldGenerateClientUtils(nitro)) {
    return
  }

  const serviceName = service.name
  const placeholders = {
    ...getDefaultPaths(nitro),
    serviceName,
  }
  const clientUtilsConfig = getClientUtilsConfig(nitro)

  // Resolve ws-client.ts path with service-specific override
  // Priority: service.paths.wsClient > global clientUtils.wsClient > default
  const wsClientPath = resolveFilePath(
    service.paths?.wsClient ?? clientUtilsConfig.wsClient,
    clientUtilsConfig.enabled,
    true,
    '{clientGraphql}/{serviceName}/ws-client.ts',
    placeholders,
  )

  if (!wsClientPath) {
    return
  }

  // Create service directory if it doesn't exist
  const serviceDir = dirname(wsClientPath)
  if (!existsSync(serviceDir)) {
    mkdirSync(serviceDir, { recursive: true })
  }

  // Only create ws-client file if it doesn't exist
  if (!existsSync(wsClientPath)) {
    const wsClientContent = generateWebSocketTemplate({
      serviceName,
      wsEndpoint,
      isExternal: true,
    })

    writeFileIfNotExists(wsClientPath, wsClientContent, `${serviceName} external ws-client.ts`)
  }
}
