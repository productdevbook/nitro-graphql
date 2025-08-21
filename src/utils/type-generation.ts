import type { Nitro } from 'nitropack'

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import consola from 'consola'
import { buildASTSchema, buildSchema } from 'graphql'
import { dirname, join, resolve } from 'pathe'
import { generateClientTypes, generateExternalClientTypes, loadExternalSchema, loadGraphQLDocuments } from './client-codegen'
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

function generateNuxtOfetchClient(clientDir: string, serviceName: string = 'default') {
  const serviceDir = resolve(clientDir, serviceName)
  const ofetchPath = resolve(serviceDir, 'ofetch.ts')

  // Create service directory if it doesn't exist
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
    writeFileSync(ofetchPath, ofetchContent, 'utf-8')
  }
}

function generateExternalOfetchClient(clientDir: string, serviceName: string, endpoint: string) {
  const serviceDir = resolve(clientDir, serviceName)
  const ofetchPath = resolve(serviceDir, 'ofetch.ts')

  // Create service directory if it doesn't exist
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
    writeFileSync(ofetchPath, ofetchContent, 'utf-8')
  }
}

export async function serverTypeGeneration(app: Nitro) {
  try {
    const schemas = app.scanSchemas || []

    if (!schemas.length) {
      consola.info('No GraphQL definitions found for server type generation.')
      return
    }

    const loadSchemas = loadFilesSync(schemas)
    const mergedSchemas = mergeTypeDefs(loadSchemas)

    const schema = buildASTSchema(mergedSchemas, {
      assumeValidSDL: true,
      assumeValid: true,
    })

    const data = await generateTypes(app.options.graphql?.framework || 'graphql-yoga', schema, app.options.graphql?.codegen?.server ?? {})

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
    // Generate main service types
    await generateMainClientTypes(nitro)

    // Generate external service types
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
    if (existsSync(oldOfetchPath)) foundFiles.push('app/graphql/ofetch.ts')
    if (existsSync(oldSdkPath)) foundFiles.push('app/graphql/sdk.ts')

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
  const schema = buildSchema(graphqlString)

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
  writeFileSync(sdkTypesPath, types.sdk, 'utf-8')

  // Generate ofetch client for Nuxt framework
  if (nitro.options.framework?.name === 'nuxt') {
    generateNuxtOfetchClient(nitro.graphql.clientDir, 'default')
    const externalServices = nitro.options.graphql?.externalServices || []
    generateGraphQLIndexFile(nitro.graphql.clientDir, externalServices)
  }
}

async function generateExternalServicesTypes(nitro: Nitro) {
  const externalServices = nitro.options.graphql?.externalServices || []

  for (const service of externalServices) {
    try {
      consola.info(`[graphql:${service.name}] Processing external service`)

      // Load external schema
      const schema = await loadExternalSchema(service)
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
        }
        catch (error) {
          consola.warn(`[graphql:${service.name}] No documents found:`, error)
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
      writeFileSync(serviceSdkPath, types.sdk, 'utf-8')

      // Generate ofetch client for Nuxt framework
      if (nitro.options.framework?.name === 'nuxt') {
        generateExternalOfetchClient(nitro.graphql.clientDir, service.name, service.endpoint)
      }

      consola.success(`[graphql:${service.name}] External service types generated successfully`)
    }
    catch (error) {
      consola.error(`[graphql:${service.name}] External service generation failed:`, error)
    }
  }
}
