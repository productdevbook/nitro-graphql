import type { GraphQLSchema } from 'graphql'
import type { CodegenClientConfig } from './types'
import { codegen } from '@graphql-codegen/core'
import { plugin as typescriptPlugin } from '@graphql-codegen/typescript'
import { plugin as typescriptOperations } from '@graphql-codegen/typescript-operations'
import { plugin as typescriptGenericSdk } from '@graphql-codegen/typescript-generic-sdk'
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'
import { loadDocuments } from '@graphql-tools/load'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import { consola } from 'consola'
import { defu } from 'defu'
import { parse } from 'graphql'

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

async function loadGraphQLDocuments(patterns: string | string[]) {
  try {
    const result = await loadDocuments(patterns, {
      loaders: [new GraphQLFileLoader()],
    })
    return result
  } catch (e: any) {
    if (
      (e.message || '').includes(
        'Unable to find any GraphQL type definitions for the following pointers:',
      )
    ) {
      // No GraphQL files found - this is normal
      return []
    } else {
      // Re-throw other errors
      throw e
    }
  }
}

export async function generateClientTypes(
  schema: GraphQLSchema,
  patterns: string | string[],
  config: CodegenClientConfig = {},
  outputPath?: string,
) {
  const docs = await loadGraphQLDocuments(patterns)

  if (docs.length === 0) {
    consola.info('[graphql] No client GraphQL files found. Skipping client type generation.')
    return ''
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
        { typescriptGenericSdk: { rawRequest: false } },
      ],
      pluginMap: {
        pluginContent: { plugin: pluginContent },
        typescript: { plugin: typescriptPlugin },
        typescriptOperations: { plugin: typescriptOperations },
        typescriptGenericSdk: { plugin: typescriptGenericSdk },
      },
    })

    return output
  } catch (error) {
    consola.warn('[graphql] Client type generation failed:', error)
    return ''
  }
}