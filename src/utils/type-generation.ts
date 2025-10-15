import type { Nitro } from 'nitro/types'

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { buildSubgraphSchema } from '@apollo/subgraph'
import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import consola from 'consola'
import { buildSchema, parse } from 'graphql'
import { basename, dirname, join, resolve } from 'pathe'
import { downloadAndSaveSchema, generateClientTypes, generateExternalClientTypes, loadExternalSchema, loadGraphQLDocuments } from './client-codegen'
import { generateTypes } from './server-codegen'

function generateGraphQLIndexFile(clientDir: string, externalServices: any[] = []) {
  const indexPath = resolve(clientDir, 'index.ts')

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

    writeFileSync(indexPath, indexContent, 'utf-8')
  }
}

function generateOfetchClient(
  clientDir: string,
  serviceName: string,
  endpoint: string,
  isDefault = false,
) {
  const serviceDir = resolve(clientDir, serviceName)
  const ofetchPath = resolve(serviceDir, 'ofetch.ts')

  if (!existsSync(serviceDir)) {
    mkdirSync(serviceDir, { recursive: true })
  }

  if (existsSync(ofetchPath)) {
    return // Don't overwrite existing files
  }

  const capitalizedServiceName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1)
  const functionName = isDefault ? 'createGraphQLClient' : `create${capitalizedServiceName}GraphQLClient`
  const exportName = isDefault ? '$sdk' : `$${serviceName}Sdk`
  const typeImports = isDefault ? 'Requester' : 'Sdk, Requester'

  const ofetchContent = `// This file is auto-generated once by nitro-graphql for quick start
// You can modify this file according to your needs
import type { ${typeImports} } from './sdk'
import { getSdk } from './sdk'

export function ${functionName}(endpoint: string${isDefault ? '' : ` = '${endpoint}'`}): Requester {
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

export const ${exportName}${isDefault ? '' : ': Sdk'} = getSdk(${functionName}(${isDefault ? '\'/api/graphql\'' : ''}))`

  writeFileSync(ofetchPath, ofetchContent, 'utf-8')
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

    const serverTypesPath = resolve(app.options.buildDir, 'types', 'nitro-graphql-server.d.ts')
    mkdirSync(dirname(serverTypesPath), { recursive: true })
    writeFileSync(serverTypesPath, data, 'utf-8')
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

  const types = await generateClientTypes(schema, loadDocs, nitro.options.graphql?.codegen?.client ?? {}, nitro.options.graphql?.codegen?.clientSDK ?? {})
  if (types === false) {
    return
  }

  const clientTypesPath = resolve(nitro.options.buildDir, 'types', 'nitro-graphql-client.d.ts')
  const defaultServiceDir = resolve(nitro.graphql.clientDir, 'default')
  const sdkTypesPath = resolve(defaultServiceDir, 'sdk.ts')

  mkdirSync(dirname(clientTypesPath), { recursive: true })
  writeFileSync(clientTypesPath, types.types, 'utf-8')
  mkdirSync(defaultServiceDir, { recursive: true })

  // Only write SDK if content has changed to prevent rebuild loops
  let shouldWriteSdk = true
  if (existsSync(sdkTypesPath)) {
    const existingContent = readFileSync(sdkTypesPath, 'utf-8')
    shouldWriteSdk = existingContent !== types.sdk
  }
  if (shouldWriteSdk) {
    writeFileSync(sdkTypesPath, types.sdk, 'utf-8')
  }

  // Generate ofetch client for Nuxt framework
  if (nitro.options.framework?.name === 'nuxt') {
    generateOfetchClient(nitro.graphql.clientDir, 'default', '/api/graphql', true)

    const externalServices = nitro.options.graphql?.externalServices || []
    generateGraphQLIndexFile(nitro.graphql.clientDir, externalServices)
  }
}

async function generateExternalServicesTypes(nitro: Nitro) {
  const externalServices = nitro.options.graphql?.externalServices || []

  for (const service of externalServices) {
    try {
      consola.info(`[graphql:${service.name}] Processing external service`)

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

      // Write service-specific type files
      const serviceTypesPath = resolve(nitro.options.buildDir, 'types', `nitro-graphql-client-${service.name}.d.ts`)
      const serviceDir = resolve(nitro.graphql.clientDir, service.name)
      const serviceSdkPath = resolve(serviceDir, 'sdk.ts')

      mkdirSync(dirname(serviceTypesPath), { recursive: true })
      writeFileSync(serviceTypesPath, types.types, 'utf-8')
      mkdirSync(serviceDir, { recursive: true })

      // Only write SDK if content has changed to prevent rebuild loops
      let shouldWriteServiceSdk = true
      if (existsSync(serviceSdkPath)) {
        const existingContent = readFileSync(serviceSdkPath, 'utf-8')
        shouldWriteServiceSdk = existingContent !== types.sdk
      }
      if (shouldWriteServiceSdk) {
        writeFileSync(serviceSdkPath, types.sdk, 'utf-8')
      }

      // Generate ofetch client for Nuxt framework
      if (nitro.options.framework?.name === 'nuxt') {
        generateOfetchClient(nitro.graphql.clientDir, service.name, service.endpoint, false)
      }

      consola.success(`[graphql:${service.name}] External service types generated successfully`)
    }
    catch (error) {
      consola.error(`[graphql:${service.name}] External service generation failed:`, error)
    }
  }
}
