/**
 * Client-side type generation
 * Framework-agnostic GraphQL client type generation
 */

import type { Source } from '@graphql-tools/utils'
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
import { GENERATED_FILE_HEADER, pluginContent } from './file-header'
import { typedDocumentStringPlugin } from './typed-document-string'

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
 * Generate generic SDK stub for schema-only generation (no documents)
 */
function generateGenericSdkContent(): string {
  return `${GENERATED_FILE_HEADER}
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

  const schemaSDL = schemaString || (schema ? printSchemaWithDirectives(schema) : null)
  if (!schemaSDL) {
    return false
  }

  const mergedConfig = defu(config, DEFAULT_CLIENT_CODEGEN_CONFIG)
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

      return { types: output, sdk: generateGenericSdkContent() }
    }

    // Full generation with documents
    const enableTypedDocumentNode = config.typedDocumentNode === true

    const plugins: Array<Record<string, object>> = [
      { pluginContent: {} },
      { typescript: {} },
      { typescriptOperations: {} },
    ]
    const pluginMap: Record<string, { plugin: unknown }> = {
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

    // SDK generation via import-types-preset
    const typesPath = virtualTypesPath || (serviceName ? `#graphql/client/${serviceName}` : '#graphql/client')
    const useTypedDocumentString = mergedConfig.documentMode === 'string'

    const sdkPlugins: Array<Record<string, object>> = [
      { pluginContent: {} },
      ...(useTypedDocumentString ? [{ typedDocumentString: {} }] : []),
      { typescriptGenericSdk: {} },
    ]
    const sdkPluginMap: Record<string, { plugin: unknown }> = {
      pluginContent: { plugin: pluginContent },
      ...(useTypedDocumentString && { typedDocumentString: { plugin: typedDocumentStringPlugin } }),
      typescriptGenericSdk: { plugin: typescriptGenericSdk },
    }

    const sdkOutput = await preset.buildGeneratesSection({
      baseOutputDir: outputPath || 'client-types.generated.ts',
      schema: parse(schemaSDL),
      documents: [...documents],
      config: resolvedSdkConfig,
      presetConfig: { typesPath },
      plugins: sdkPlugins,
      pluginMap: sdkPluginMap,
    })

    const results = await Promise.all(
      sdkOutput.map(async config => ({
        file: config.filename,
        content: await codegen(config),
      })),
    )

    return {
      types: output,
      sdk: results[0]?.content || '',
    }
  }
  catch (error) {
    consola.error('[nitro-graphql] Client type generation failed:', (error as Error).message)
    return false
  }
}

/**
 * Generate client types for an external GraphQL service
 */
export async function generateExternalClientTypesCore(
  service: ExternalServiceCodegenConfig,
  schema: import('graphql').GraphQLSchema,
  documents: Source[],
  virtualTypesPath?: string,
): Promise<ClientCodegenResult | false> {
  return generateClientTypesCore({
    schema,
    documents,
    config: service.codegen?.client || {},
    sdkConfig: service.codegen?.clientSDK || {},
    serviceName: service.name,
    virtualTypesPath,
  })
}
