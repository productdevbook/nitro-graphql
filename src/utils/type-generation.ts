import type { Nitro } from 'nitropack'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { buildSubgraphSchema } from '@apollo/subgraph'
import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import consola from 'consola'
import { buildSchema, parse } from 'graphql'
import { basename, dirname, join, resolve } from 'pathe'
import { downloadAndSaveSchema, generateClientTypes, generateExternalClientTypes, loadExternalSchema, loadGraphQLDocuments } from './client-codegen'
import { writeFileIfNotExists } from './file-generator'
import {
  getClientUtilsConfig,
  getDefaultPaths,
  getSdkConfig,
  getTypesConfig,
  resolveFilePath,
  shouldGenerateClientUtils,
  shouldGenerateTypes,
} from './path-resolver'
import { generateTypes } from './server-codegen'

function generateGraphQLIndexFile(
  nitro: Nitro,
  clientDir: string,
  externalServices: any[] = [],
) {
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
    '{clientGraphql}/index.ts',
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
// === Query/Mutation Client ===
export * from './default/ofetch'

// === Subscription Composables (Vue) ===
// Export useCountdown, useGreetings, useSubscriptionSession, etc.
export * from './default/sdk'

// === External GraphQL Services ===
// When you add new external services, add their exports here:
// export * from './yourServiceName/ofetch'
`

    // Add exports for external services
    for (const service of externalServices) {
      indexContent += `export * from './${service.name}/ofetch'\n`
    }

    writeFileIfNotExists(indexPath, indexContent, 'client index.ts')
  }
}

function generateNuxtOfetchClient(
  nitro: Nitro,
  clientDir: string,
  serviceName: string = 'default',
) {
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

  // Only create ofetch.ts if it doesn't exist
  if (!existsSync(ofetchPath)) {
    const ofetchContent = `// This file is auto-generated once by nitro-graphql for quick start
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
    writeFileIfNotExists(ofetchPath, ofetchContent, `${serviceName} ofetch.ts`)
  }
}

function generateExternalOfetchClient(
  nitro: Nitro,
  service: any, // ExternalGraphQLService
  endpoint: string,
) {
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
    const capitalizedServiceName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1)
    const ofetchContent = `// This file is auto-generated once by nitro-graphql for quick start
// You can modify this file according to your needs
import type { Sdk, Requester } from './sdk'
import { getSdk } from './sdk'

export function create${capitalizedServiceName}GraphQLClient(endpoint: string = '${endpoint}'): Requester {
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

export const $${serviceName}Sdk: Sdk = getSdk(create${capitalizedServiceName}GraphQLClient())`
    writeFileIfNotExists(ofetchPath, ofetchContent, `${serviceName} external ofetch.ts`)
  }
}

/**
 * Check for duplicate type definitions using a simpler approach
 * Try to build each schema individually - if that succeeds but merging fails, we have duplicates
 * @returns true if validation passes, false if duplicates found
 */
function validateNoDuplicateTypes(schemas: string[], schemaStrings: string[]): boolean {
  // Build individual schemas first to check if they're valid individually
  const individualSchemasByFile = new Map<string, string>()

  schemaStrings.forEach((schemaContent, index) => {
    const schemaPath = schemas[index]!
    const fileName = basename(schemaPath)

    try {
      // Try to parse each schema individually
      parse(schemaContent)
      individualSchemasByFile.set(fileName, schemaContent)
    }
    catch (error) {
      consola.warn(`Invalid GraphQL syntax in ${fileName}:`, error)
      throw error
    }
  })

  // Try to merge without throwOnConflict first - if this succeeds but we know we have duplicate
  // type names, that means GraphQL is silently merging them
  try {
    // Try merge without conflict check first
    mergeTypeDefs([schemaStrings.join('\n\n')], {
      throwOnConflict: false,
      commentDescriptions: true,
      sort: true,
    })

    // Now try with throwOnConflict - this should catch field conflicts
    mergeTypeDefs([schemaStrings.join('\n\n')], {
      throwOnConflict: true,
      commentDescriptions: true,
      sort: true,
    })
  }
  catch (conflictError: any) {
    // If we get a field conflict error, that's good - it means throwOnConflict is working
    // Re-throw it with better context
    if (conflictError?.message?.includes('already defined with a different type')) {
      throw conflictError
    }
  }

  // Manual duplicate type name detection
  const typeNames = new Set<string>()
  const duplicateTypes: Array<{ type: string, files: string[] }> = []

  schemaStrings.forEach((schemaContent, index) => {
    const fileName = basename(schemas[index]!)

    try {
      const document = parse(schemaContent)

      document.definitions.forEach((def) => {
        if (def.kind === 'ObjectTypeDefinition'
          || def.kind === 'InterfaceTypeDefinition'
          || def.kind === 'UnionTypeDefinition'
          || def.kind === 'EnumTypeDefinition'
          || def.kind === 'InputObjectTypeDefinition'
          || def.kind === 'ScalarTypeDefinition') {
          const typeName = def.name.value

          // Skip built-in scalars
          if (['String', 'Int', 'Float', 'Boolean', 'ID', 'DateTime', 'JSON'].includes(typeName)) {
            return
          }

          if (typeNames.has(typeName)) {
            // Found a duplicate
            const existing = duplicateTypes.find(d => d.type === typeName)
            if (existing) {
              existing.files.push(fileName)
            }
            else {
              // Find which file had it first
              const firstFile = schemas.find((_, i) => {
                const content = schemaStrings[i]
                if (!content)
                  return false
                try {
                  const doc = parse(content)
                  return doc.definitions.some(d =>
                    (d.kind === 'ObjectTypeDefinition'
                      || d.kind === 'InterfaceTypeDefinition'
                      || d.kind === 'UnionTypeDefinition'
                      || d.kind === 'EnumTypeDefinition'
                      || d.kind === 'InputObjectTypeDefinition'
                      || d.kind === 'ScalarTypeDefinition')
                    && d.name.value === typeName,
                  )
                }
                catch {
                  return false
                }
              })
              duplicateTypes.push({
                type: typeName,
                files: [basename(firstFile || ''), fileName],
              })
            }
          }
          else {
            typeNames.add(typeName)
          }
        }
      })
    }
    catch {
      // Already handled above
    }
  })

  if (duplicateTypes.length > 0) {
    // Build a comprehensive error message
    let errorMessage = '⚠️  DUPLICATE TYPE DEFINITIONS DETECTED!\n\n'

    duplicateTypes.forEach(({ type, files }) => {
      errorMessage += `❌ Type "${type}" is defined in multiple files:\n`

      // Show full file paths for each duplicate
      files.forEach((fileName) => {
        const fullPath = schemas.find(path => basename(path) === fileName) || fileName
        errorMessage += `   • ${fullPath}\n`
      })
      errorMessage += '\n'
    })

    errorMessage += '💡 Each GraphQL type should only be defined once.\n'
    errorMessage += '   Consider using "extend type" syntax instead of duplicate definitions.\n'
    errorMessage += `\n🔍 Found ${duplicateTypes.length} duplicate type(s): ${duplicateTypes.map(d => d.type).join(', ')}`

    consola.error(errorMessage)
    return false // Validation failed
  }

  return true // Validation passed
}

export async function serverTypeGeneration(app: Nitro) {
  try {
    // Check if type generation is enabled
    if (!shouldGenerateTypes(app)) {
      consola.debug('[nitro-graphql] Server type generation is disabled')
      return
    }

    const schemas = app.scanSchemas || []

    if (!schemas.length) {
      consola.info('No GraphQL definitions found for server type generation.')
      return
    }

    const loadSchemas = loadFilesSync(schemas)
    // Convert to string format similar to route handlers
    const schemaStrings = loadSchemas.map(schema =>
      typeof schema === 'string' ? schema : schema.loc?.source?.body || '',
    ).filter(Boolean)

    // Validate for duplicate type definitions before merging
    const isValid = validateNoDuplicateTypes(schemas, schemaStrings)
    if (!isValid) {
      return // Exit early if duplicates found
    }

    // Add Federation directives for buildSchema if federation is enabled
    const federationEnabled = app.options.graphql?.federation?.enabled === true

    const mergedSchemas = mergeTypeDefs([schemaStrings.join('\n\n')], {
      throwOnConflict: true,
      commentDescriptions: true,
      sort: true,
    })

    const schema = federationEnabled
      ? buildSubgraphSchema([{
          typeDefs: parse(mergedSchemas),
        }])
      : buildSchema(mergedSchemas)

    const data = await generateTypes(app.options.graphql?.framework || 'graphql-yoga', schema, app.options.graphql ?? {})

    const printSchema = printSchemaWithDirectives(schema)

    const schemaPath = resolve(app.graphql.buildDir, 'schema.graphql')
    mkdirSync(dirname(schemaPath), { recursive: true })
    writeFileSync(schemaPath, printSchema, 'utf-8')

    // Resolve server types path from config
    const placeholders = getDefaultPaths(app)
    const typesConfig = getTypesConfig(app)

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
    }
  }
  catch (error) {
    consola.error('Server schema generation error:', error)
  }
}

export async function clientTypeGeneration(
  nitro: Nitro,
) {
  try {
    // Generate main service types (only if server schema exists)
    const hasServerSchema = nitro.scanSchemas && nitro.scanSchemas.length > 0
    if (hasServerSchema) {
      await generateMainClientTypes(nitro)
    }

    // Generate external service types (can work independently)
    if (nitro.options.graphql?.externalServices?.length) {
      await generateExternalServicesTypes(nitro)
    }
  }
  catch (error) {
    consola.error('Client schema generation error:', error)
  }
}

/**
 * Check for old structure files and warn user about manual migration
 */
function checkOldStructure(clientDir: string): void {
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

async function generateMainClientTypes(nitro: Nitro) {
  // Check for old structure files and warn user
  checkOldStructure(nitro.graphql.clientDir)

  const docs = nitro.scanDocuments
  const loadDocs = await loadGraphQLDocuments(docs)

  const schemaFilePath = join(nitro.graphql.buildDir, 'schema.graphql')
  if (!existsSync(schemaFilePath)) {
    consola.info('Schema file not ready yet for client type generation. Server types need to be generated first.')
    return
  }

  const graphqlString = readFileSync(schemaFilePath, 'utf-8')
  const federationEnabled = nitro.options.graphql?.federation?.enabled === true
  const schema = federationEnabled
    ? buildSubgraphSchema([{
        typeDefs: parse(graphqlString),
      }])
    : buildSchema(graphqlString)

  const types = await generateClientTypes(
    schema,
    loadDocs,
    nitro.options.graphql?.codegen?.client ?? {},
    nitro.options.graphql?.codegen?.clientSDK ?? {},
    undefined,
    undefined,
    undefined,
    nitro.options.graphql?.subscriptions?.enabled ?? false,
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
  }

  // Generate ofetch client for Nuxt framework
  if (nitro.options.framework?.name === 'nuxt') {
    // Always generate default service ofetch client (only if it doesn't exist)
    generateNuxtOfetchClient(nitro, nitro.graphql.clientDir, 'default')

    const externalServices = nitro.options.graphql?.externalServices || []
    generateGraphQLIndexFile(nitro, nitro.graphql.clientDir, externalServices)
  }
}

async function generateExternalServicesTypes(nitro: Nitro) {
  const externalServices = nitro.options.graphql?.externalServices || []

  for (const service of externalServices) {
    try {

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
      let loadDocs: any[] = []

      if (documentPatterns.length > 0) {
        try {
          loadDocs = await loadGraphQLDocuments(documentPatterns)
          if (!loadDocs || loadDocs.length === 0) {
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
      const types = await generateExternalClientTypes(service, schema, loadDocs)
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
      }

      // Generate ofetch client for Nuxt framework
      if (nitro.options.framework?.name === 'nuxt') {
        generateExternalOfetchClient(nitro, service, service.endpoint)
      }
    }
    catch (error) {
      consola.error(`[graphql:${service.name}] External service generation failed:`, error)
    }
  }
}
