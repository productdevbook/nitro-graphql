import type { Nitro } from 'nitropack'

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
    const defs = app.scanDefs || []
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
  app: Nitro,
  path: string,
) {
  try {
    const root = app.graphql.watchDirs.find(dir => path.startsWith(dir)) || path
    if (!root) {
      return
    }
    const docs = await loadGraphQLDocuments(root)
    const graphqlString = readFileSync(join(app.graphql.buildDir, 'schema.graphql'), 'utf-8')
    const schema = buildSchema(graphqlString)

    const types = await generateClientTypes(schema, docs)
    if (types === false) {
      return
    }
    const clientTypesPath = resolve(app.options.buildDir, 'types', 'nitro-graphql-client.d.ts')
    const sdkTypesPath = resolve(app.graphql.clientDir, 'sdk.ts')
    writeFileSync(clientTypesPath, types.types, 'utf-8')
    writeFileSync(sdkTypesPath, types.sdk, 'utf-8')
  }
  catch (error) {
    consola.error('Client schema generation error:', error)
  }
}
