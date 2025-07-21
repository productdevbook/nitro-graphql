import type { Nitro } from 'nitropack'

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import consola from 'consola'
import { buildASTSchema, buildSchema } from 'graphql'
import { dirname, join, resolve } from 'pathe'
import { generateClientTypes, loadGraphQLDocuments } from './client-codegen'
import { generateTypes } from './server-codegen'

function generateNuxtOfetchClient(clientDir: string) {
  const ofetchPath = resolve(clientDir, 'ofetch.ts')

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

    const data = await generateTypes(schema, app.options.graphql?.codegen?.server ?? {})

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
    const sdkTypesPath = resolve(nitro.graphql.clientDir, 'sdk.ts')
    mkdirSync(dirname(clientTypesPath), { recursive: true })
    writeFileSync(clientTypesPath, types.types, 'utf-8')
    mkdirSync(dirname(sdkTypesPath), { recursive: true })
    writeFileSync(sdkTypesPath, types.sdk, 'utf-8')

    // Generate ofetch client for Nuxt framework
    if (nitro.options.framework?.name === 'nuxt') {
      generateNuxtOfetchClient(nitro.graphql.clientDir)
    }
  }
  catch (error) {
    consola.error('Client schema generation error:', error)
  }
}
