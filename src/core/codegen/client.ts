/**
 * Client-side type generation
 * Framework-agnostic GraphQL client type generation
 */

import type { LoadSchemaOptions, UnnormalizedTypeDefPointer } from '@graphql-tools/load'
import type { Source } from '@graphql-tools/utils'
import type { GraphQLSchema } from 'graphql'
import type {
  ClientCodegenConfig,
  ClientCodegenInput,
  ClientCodegenResult,
  ExternalServiceCodegenConfig,
} from '../types/codegen'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { codegen } from '@graphql-codegen/core'
import { preset } from '@graphql-codegen/import-types-preset'
import { plugin as typedDocumentNodePlugin } from '@graphql-codegen/typed-document-node'
import { plugin as typescriptPlugin } from '@graphql-codegen/typescript'
import { plugin as typescriptGenericSdk } from '@graphql-codegen/typescript-generic-sdk'
import { plugin as typescriptOperations } from '@graphql-codegen/typescript-operations'
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'
import { loadDocuments, loadSchemaSync } from '@graphql-tools/load'
import { UrlLoader } from '@graphql-tools/url-loader'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import { defu } from 'defu'
import { parse } from 'graphql'
import { dirname, resolve } from 'pathe'
import { DEFAULT_GRAPHQL_SCALARS } from '../constants'
import { pluginContent } from './plugin'

/**
 * Type definition pointer for GraphQL schemas
 */
export type GraphQLTypeDefPointer = UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[]

/**
 * Options for loading GraphQL schemas
 */
export type GraphQLLoadSchemaOptions = Partial<LoadSchemaOptions>

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
 * Load GraphQL schema synchronously
 */
export function graphQLLoadSchemaSync(
  schemaPointers: GraphQLTypeDefPointer,
  data: GraphQLLoadSchemaOptions = {},
): GraphQLSchema | undefined {
  const pointers = Array.isArray(schemaPointers) ? schemaPointers : [schemaPointers]
  const filteredPointers = [
    ...pointers,
    '!**/vfs/**',
  ]

  try {
    return loadSchemaSync(filteredPointers, {
      ...data,
      loaders: [
        new GraphQLFileLoader(),
        new UrlLoader(),
        ...(data.loaders || []),
      ],
    })
  }
  catch (e: unknown) {
    const error = e as Error
    if (
      (error.message || '').includes(
        'Unable to find any GraphQL type definitions for the following pointers:',
      )
    ) {
      return undefined
    }
    throw e
  }
}

/**
 * Check if a path is a URL
 */
function isUrl(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://')
}

/**
 * Load schema from external GraphQL service
 */
export async function loadExternalSchema(
  service: ExternalServiceCodegenConfig,
  buildDir?: string,
): Promise<GraphQLSchema | undefined> {
  try {
    const headers = typeof service.headers === 'function' ? service.headers() : service.headers || {}
    const schemaSource = service.schema ?? service.endpoint
    const schemas = Array.isArray(schemaSource) ? schemaSource : [schemaSource]

    if (service.downloadSchema && buildDir) {
      const defaultPath = resolve(buildDir, 'graphql', 'schemas', `${service.name}.graphql`)
      const schemaFilePath = service.downloadPath ? resolve(service.downloadPath) : defaultPath

      if (existsSync(schemaFilePath)) {
        try {
          return loadSchemaSync([schemaFilePath], {
            loaders: [new GraphQLFileLoader()],
          })
        }
        catch {
          // Cached schema invalid, continue to load from source
        }
      }
    }

    const hasUrls = schemas.some(schema => isUrl(schema))
    const hasLocalFiles = schemas.some(schema => !isUrl(schema))
    const loaders = []
    if (hasLocalFiles) {
      loaders.push(new GraphQLFileLoader())
    }
    if (hasUrls) {
      loaders.push(new UrlLoader())
    }

    if (loaders.length === 0) {
      throw new Error('No appropriate loaders found for schema sources')
    }

    return loadSchemaSync(schemas, {
      loaders,
      ...(Object.keys(headers).length > 0 && { headers }),
    })
  }
  catch {
    return undefined
  }
}

/**
 * Download and save schema from external service
 */
export async function downloadAndSaveSchema(
  service: ExternalServiceCodegenConfig,
  buildDir: string,
): Promise<string | undefined> {
  const downloadMode = service.downloadSchema

  if (!downloadMode || downloadMode === 'manual') {
    return undefined
  }

  const defaultPath = resolve(buildDir, 'graphql', 'schemas', `${service.name}.graphql`)
  const schemaFilePath = service.downloadPath ? resolve(service.downloadPath) : defaultPath

  try {
    const headers = typeof service.headers === 'function' ? service.headers() : service.headers || {}
    const schemaSource = service.schema ?? service.endpoint
    const schemas = Array.isArray(schemaSource) ? schemaSource : [schemaSource]

    const hasUrlSchemas = schemas.some(schema => isUrl(schema))
    const hasLocalSchemas = schemas.some(schema => !isUrl(schema))

    let shouldDownload = false
    const fileExists = existsSync(schemaFilePath)

    if (downloadMode === 'always') {
      shouldDownload = true

      if (fileExists && hasUrlSchemas) {
        try {
          const remoteSchema = loadSchemaSync(schemas.filter(isUrl), {
            loaders: [new UrlLoader()],
            ...(Object.keys(headers).length > 0 && { headers }),
          })
          const remoteSchemaString = printSchemaWithDirectives(remoteSchema)
          const remoteHash = createHash('md5').update(remoteSchemaString).digest('hex')

          const localSchemaString = readFileSync(schemaFilePath, 'utf-8')
          const localHash = createHash('md5').update(localSchemaString).digest('hex')

          if (remoteHash === localHash) {
            shouldDownload = false
          }
        }
        catch {
          shouldDownload = true
        }
      }
      else if (fileExists && hasLocalSchemas) {
        const localFiles = schemas.filter(schema => !isUrl(schema))
        let sourceIsNewer = false

        for (const localFile of localFiles) {
          if (existsSync(localFile)) {
            const { statSync } = await import('node:fs')
            const sourceStats = statSync(localFile)
            const cachedStats = statSync(schemaFilePath)
            if (sourceStats.mtime > cachedStats.mtime) {
              sourceIsNewer = true
              break
            }
          }
        }

        if (!sourceIsNewer) {
          shouldDownload = false
        }
      }
    }
    else if (downloadMode === true || downloadMode === 'once') {
      shouldDownload = !fileExists
    }

    if (shouldDownload) {
      let schema: GraphQLSchema

      if (hasUrlSchemas && hasLocalSchemas) {
        schema = loadSchemaSync(schemas, {
          loaders: [new GraphQLFileLoader(), new UrlLoader()],
          ...(Object.keys(headers).length > 0 && { headers }),
        })
      }
      else if (hasUrlSchemas) {
        schema = loadSchemaSync(schemas, {
          loaders: [new UrlLoader()],
          ...(Object.keys(headers).length > 0 && { headers }),
        })
      }
      else {
        schema = loadSchemaSync(schemas, {
          loaders: [new GraphQLFileLoader()],
        })
      }

      const schemaString = printSchemaWithDirectives(schema)
      mkdirSync(dirname(schemaFilePath), { recursive: true })
      writeFileSync(schemaFilePath, schemaString, 'utf-8')
    }

    return schemaFilePath
  }
  catch {
    return undefined
  }
}

/**
 * Load GraphQL documents from files
 */
export async function loadGraphQLDocuments(patterns: string | string[]): Promise<Source[]> {
  try {
    return await loadDocuments(patterns, {
      loaders: [new GraphQLFileLoader()],
    })
  }
  catch (e: unknown) {
    const error = e as Error
    if (
      (error.message || '').includes(
        'Unable to find any GraphQL type definitions for the following pointers:',
      )
    ) {
      return []
    }
    throw e
  }
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

  const mergedConfig = defu(DEFAULT_CLIENT_CODEGEN_CONFIG, config)
  const mergedSdkConfig = defu(mergedConfig, sdkConfig)

  try {
    // Schema-only generation (no documents)
    if (documents.length === 0) {
      const output = await codegen({
        filename: outputPath || 'client-types.generated.ts',
        schema: parse(printSchemaWithDirectives(schema)),
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
      schema: parse(printSchemaWithDirectives(schema)),
      documents: [...documents],
      config: mergedConfig,
      plugins,
      pluginMap,
    })

    const typesPath = virtualTypesPath || (serviceName ? `#graphql/client/${serviceName}` : '#graphql/client')
    const sdkOutput = await preset.buildGeneratesSection({
      baseOutputDir: outputPath || 'client-types.generated.ts',
      schema: parse(printSchemaWithDirectives(schema)),
      documents: [...documents],
      config: mergedSdkConfig,
      presetConfig: {
        typesPath,
      },
      plugins: [
        { pluginContent: {} },
        { typescriptGenericSdk: {} },
      ],
      pluginMap: {
        pluginContent: { plugin: pluginContent },
        typescriptGenericSdk: { plugin: typescriptGenericSdk },
      },
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
  catch {
    return false
  }
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
