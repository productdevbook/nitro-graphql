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

export async function serverTypeGeneration(app: Nitro) {
  try {
    const defs = app.scanSchemas || []

    if (!defs.length) {
      consola.info('No GraphQL definitions found for server type generation.')
      return
    }

    const loadDefs = loadFilesSync(defs)
    const mergedDefs = mergeTypeDefs(loadDefs)

    const schema = buildASTSchema(mergedDefs, {
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

    const types = await generateClientTypes(schema, loadDocs)
    if (types === false) {
      return
    }
    const clientTypesPath = resolve(nitro.options.buildDir, 'types', 'nitro-graphql-client.d.ts')
    const sdkTypesPath = resolve(nitro.graphql.clientDir, 'sdk.ts')
    writeFileSync(clientTypesPath, types.types, 'utf-8')
    writeFileSync(sdkTypesPath, types.sdk, 'utf-8')
  }
  catch (error) {
    consola.error('Client schema generation error:', error)
  }
}
