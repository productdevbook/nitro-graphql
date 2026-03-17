/**
 * Client-side type generation
 * Framework-agnostic GraphQL client type generation
 */

import type { Source } from '@graphql-tools/utils'
import type { GraphQLSchema } from 'graphql'
import type {
  ClientCodegenConfig,
  ClientCodegenInput,
  ClientCodegenResult,
  ExternalServiceCodegenConfig,
} from '../types/codegen'
import { codegen } from '@graphql-codegen/core'
import { preset } from '@graphql-codegen/import-types-preset'
import { plugin as typedDocumentNodePlugin } from '@graphql-codegen/typed-document-node'
import { plugin as typescriptPlugin } from '@graphql-codegen/typescript'
import { plugin as typescriptGenericSdk } from '@graphql-codegen/typescript-generic-sdk'
import { plugin as typescriptOperations } from '@graphql-codegen/typescript-operations'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import consola from 'consola'
import { defu } from 'defu'
import { parse } from 'graphql'
import { DEFAULT_GRAPHQL_SCALARS } from '../constants'
import { pluginContent } from './plugin'
import { typedDocumentStringPlugin } from './plugins/typed-document-string'

export { loadGraphQLDocuments } from './document-loader'
// Re-export from split modules for backward compatibility
export type { GraphQLLoadSchemaOptions, GraphQLTypeDefPointer } from './schema-loader'
export { downloadAndSaveSchema, graphQLLoadSchemaSync, loadExternalSchema } from './schema-loader'

/**
 * Default client codegen configuration
 */
export const DEFAULT_CLIENT_CODEGEN_CONFIG: ClientCodegenConfig = {
  emitLegacyCommonJSImports: false,
  useTypeImports: true,
  enumsAsTypes: true,
  strictScalars: true,
  maybeValue: 'T | null | undefined',
  inputMaybeValue: 'T | undefined',
  documentMode: 'string',
  pureMagicComment: true,
  dedupeOperationSuffix: true,
  rawRequest: true,
  scalars: DEFAULT_GRAPHQL_SCALARS,
}

/**
 * Generate generic SDK content for schema-only generation
 */
function generateGenericSdkContent(): string {
  return `// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */

import type { GraphQLResolveInfo } from 'graphql'
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> }

export interface Requester<C = {}, E = unknown> {
  <R, V>(doc: string, vars?: V, options?: C): Promise<R> | AsyncIterable<R>
}

export type Sdk = {
  request: <R, V = Record<string, any>>(document: string, variables?: V) => Promise<R>
}

export function getSdk(requester: Requester): Sdk {
  return {
    request: <R, V = Record<string, any>>(document: string, variables?: V): Promise<R> => {
      return requester<R, V>(document, variables)
    }
  }
}
`
}

/**
 * Generate client-side GraphQL types
 * Pure function that generates TypeScript types from a GraphQL schema and documents
 */
export async function generateClientTypesCore(
  input: ClientCodegenInput,
): Promise<ClientCodegenResult | false> {
  const {
    schema,
    schemaString,
    documents,
    config = {},
    sdkConfig = {},
    outputPath,
    serviceName,
    virtualTypesPath,
  } = input

  // For non-external services (no serviceName), documents are required
  if (documents.length === 0 && !serviceName) {
    return false
  }

  // Get schema string - use provided schemaString to avoid graphql instance mismatch
  const schemaSDL = schemaString || (schema ? printSchemaWithDirectives(schema) : null)
  if (!schemaSDL) {
    return false
  }

  const mergedConfig = defu(config, DEFAULT_CLIENT_CODEGEN_CONFIG)

  /** SDK config inherits from merged client config, with user overrides taking precedence */
  const resolvedSdkConfig = defu(sdkConfig, mergedConfig)

  try {
    // Schema-only generation (no documents)
    if (documents.length === 0) {
      const output = await codegen({
        filename: outputPath || 'client-types.generated.ts',
        schema: parse(schemaSDL),
        documents: [],
        config: mergedConfig,
        plugins: [
          { pluginContent: {} },
          { typescript: {} },
        ],
        pluginMap: {
          pluginContent: { plugin: pluginContent },
          typescript: { plugin: typescriptPlugin },
        },
      })

      const sdkContent = generateGenericSdkContent()

      return {
        types: output,
        sdk: sdkContent,
      }
    }

    // Full generation with documents
    const enableTypedDocumentNode = config.typedDocumentNode === true

    const plugins: Array<Record<string, object>> = [
      { pluginContent: {} },
      { typescript: {} },
      { typescriptOperations: {} },
    ]
    const pluginMap: Record<string, { plugin: any }> = {
      pluginContent: { plugin: pluginContent },
      typescript: { plugin: typescriptPlugin },
      typescriptOperations: { plugin: typescriptOperations },
    }

    if (enableTypedDocumentNode) {
      plugins.push({ typedDocumentNode: {} })
      pluginMap.typedDocumentNode = { plugin: typedDocumentNodePlugin }
    }

    const output = await codegen({
      filename: outputPath || 'client-types.generated.ts',
      schema: parse(schemaSDL),
      documents: [...documents],
      config: mergedConfig,
      plugins,
      pluginMap,
    })

    const typesPath = virtualTypesPath || (serviceName ? `#graphql/client/${serviceName}` : '#graphql/client')

    // Build SDK plugins — include TypedDocumentString plugin when documentMode is 'string'
    // so the class definition is part of the codegen pipeline instead of raw string prepend
    const useTypedDocumentString = mergedConfig.documentMode === 'string'
    const sdkPlugins: Array<Record<string, object>> = [
      { pluginContent: {} },
      ...(useTypedDocumentString ? [{ typedDocumentString: {} }] : []),
      { typescriptGenericSdk: {} },
    ]
    const sdkPluginMap: Record<string, { plugin: any }> = {
      pluginContent: { plugin: pluginContent },
      ...(useTypedDocumentString && { typedDocumentString: { plugin: typedDocumentStringPlugin } }),
      typescriptGenericSdk: { plugin: typescriptGenericSdk },
    }

    const sdkOutput = await preset.buildGeneratesSection({
      baseOutputDir: outputPath || 'client-types.generated.ts',
      schema: parse(schemaSDL),
      documents: [...documents],
      config: resolvedSdkConfig,
      presetConfig: {
        typesPath,
      },
      plugins: sdkPlugins,
      pluginMap: sdkPluginMap,
    })

    const results = await Promise.all(
      sdkOutput.map(async (config) => {
        return { file: config.filename, content: await codegen(config) }
      }),
    )

    const sdkContent = results[0]?.content || ''

    return {
      types: output,
      sdk: sdkContent,
    }
  }
  catch (error) {
    // Log codegen errors - these are usually configuration issues like missing scalar definitions
    consola.error('[nitro-graphql] Client type generation failed:', (error as Error).message)
    return false
  }
}

/**
 * Generate client types for external GraphQL service
 */
export async function generateExternalClientTypesCore(
  service: ExternalServiceCodegenConfig,
  schema: GraphQLSchema,
  documents: Source[],
  virtualTypesPath?: string,
): Promise<ClientCodegenResult | false> {
  const config = service.codegen?.client || {}
  const sdkConfig = service.codegen?.clientSDK || {}

  return generateClientTypesCore({
    schema,
    documents,
    config,
    sdkConfig,
    serviceName: service.name,
    virtualTypesPath,
  })
}

// Subscription utilities — re-exported from split modules
export { extractSubscriptions } from './subscription-extractor'
export type { SubscriptionInfo } from './subscription-extractor'
export { generateSubscriptionBuilder } from './vue-subscription-builder'
