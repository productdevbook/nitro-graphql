import type { LoadSchemaOptions, UnnormalizedTypeDefPointer } from '@graphql-tools/load'
import type { Source } from '@graphql-tools/utils'
import type { GraphQLSchema } from 'graphql'
import type { CodegenClientConfig } from './types'
import { codegen } from '@graphql-codegen/core'
import { preset } from '@graphql-codegen/import-types-preset'
import { plugin as typescriptPlugin } from '@graphql-codegen/typescript'
import { plugin as typescriptGenericSdk } from '@graphql-codegen/typescript-generic-sdk'
import { plugin as typescriptOperations } from '@graphql-codegen/typescript-operations'
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'
import { loadDocuments, loadSchemaSync } from '@graphql-tools/load'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import { consola } from 'consola'
import { defu } from 'defu'
import { parse } from 'graphql'

/**
 * Type definition pointer for GraphQL schemas
 */
export type GraphQLTypeDefPointer = UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[]

/**
 * Options for loading GraphQL schemas
 */
export type GraphQLLoadSchemaOptions = Partial<LoadSchemaOptions>

function pluginContent(_schema: any, _documents: any, _config: any, _info: any) {
  return {
    prepend: [
      '// THIS FILE IS GENERATED, DO NOT EDIT!',
      '/* eslint-disable eslint-comments/no-unlimited-disable */',
      '/* tslint:disable */',
      '/* eslint-disable */',
      '/* prettier-ignore */',
    ],
    content: '',
  }
}

export async function graphQLLoadSchemaSync(
  schemaPointers: GraphQLTypeDefPointer,
  data: GraphQLLoadSchemaOptions = {},
) {
  // Exclude vfs directory from schema pointers if using globs
  const pointers = Array.isArray(schemaPointers) ? schemaPointers : [schemaPointers]
  const filteredPointers = [
    ...pointers,
    '!**/vfs/**', // Exclude all files in any vfs directory
  ]
  let result: GraphQLSchema | undefined
  try {
    result = loadSchemaSync(filteredPointers, {
      ...data,
      loaders: [
        new GraphQLFileLoader(),
        ...((data.loaders || []) as any[]),
      ],
    })
  }
  catch (e: any) {
    if (
      // https://www.graphql-tools.com/docs/documents-loading#no-files-found
      (e.message || '').includes(
        'Unable to find any GraphQL type definitions for the following pointers:',
      )
    ) {
      // Ignore - it's okay if no GraphQL files exist
      consola.info('No server GraphQL files found. If you need server-side GraphQL, add .graphql files to your server directory.')
    }
    else {
      throw e
    }
  }
  return result
}

export async function loadGraphQLDocuments(patterns: string | string[]) {
  try {
    const result = await loadDocuments(patterns, {
      loaders: [new GraphQLFileLoader()],
    })
    return result
  }
  catch (e: any) {
    if (
      (e.message || '').includes(
        'Unable to find any GraphQL type definitions for the following pointers:',
      )
    ) {
      // No GraphQL files found - this is normal
      return []
    }
    else {
      // Re-throw other errors
      throw e
    }
  }
}

export async function generateClientTypes(
  schema: GraphQLSchema,
  docs: Source[],
  config: CodegenClientConfig = {},
  outputPath?: string,
) {
  if (docs.length === 0) {
    consola.info('[graphql] No client GraphQL files found. Skipping client type generation.')
    return false
  }

  consola.info(`[graphql] Found ${docs.length} client GraphQL documents`)

  const defaultConfig: CodegenClientConfig = {
    documentMode: 'string',
    emitLegacyCommonJSImports: false,
    useTypeImports: true,
    enumsAsTypes: true,
    strictScalars: true,
    maybeValue: 'T | null | undefined',
    inputMaybeValue: 'T | undefined',
    scalars: {
      DateTime: 'string',
      JSON: 'any',
      UUID: 'string',
      NonEmptyString: 'string',
      Currency: 'string',
    },
  }

  const mergedConfig = defu(config, defaultConfig)

  try {
    const output = await codegen({
      filename: outputPath || 'client-types.generated.ts',
      schema: parse(printSchemaWithDirectives(schema)),
      documents: [...docs],
      config: mergedConfig,
      plugins: [
        { pluginContent: {} },
        { typescript: {} },
        { typescriptOperations: {} },
      ],
      pluginMap: {
        pluginContent: { plugin: pluginContent },
        typescript: { plugin: typescriptPlugin },
        typescriptOperations: { plugin: typescriptOperations },
      },
    })

    const sdkOutput = await preset.buildGeneratesSection({
      baseOutputDir: outputPath || 'client-types.generated.ts',
      schema: parse(printSchemaWithDirectives(schema)),
      documents: [...docs],
      config: {
        documentMode: 'string',
        pureMagicComment: true,
        strictScalars: true,
        scalars: {
          DateTime: 'Date',
          JSON: 'any',
          UUID: 'string',
          NonEmptyString: 'string',
          Currency: 'string',
        },
      },
      presetConfig: {
        typesPath: '#graphql-client',

      },
      plugins: [
        { pluginContent: {} },
        { typescriptOperations: {} },
        { typescriptGenericSdk: { rawRequest: false } },
      ],
      pluginMap: {
        pluginContent: { plugin: pluginContent },
        typescriptOperations: { plugin: typescriptOperations },
        typescriptGenericSdk: { plugin: typescriptGenericSdk },
      },
    })

    const results = await Promise.all(
      sdkOutput.map(async (config) => {
        return { file: config.filename, content: await codegen(config) }
      }),
    )

    return {
      types: output,
      sdk: results[0]?.content || '',
    }
  }
  catch (error) {
    consola.warn('[graphql] Client type generation failed:', error)
    return false
  }
}
