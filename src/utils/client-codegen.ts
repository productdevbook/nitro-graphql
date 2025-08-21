import type { LoadSchemaOptions, UnnormalizedTypeDefPointer } from '@graphql-tools/load'
import type { Source } from '@graphql-tools/utils'
import type { GraphQLSchema } from 'graphql'
import type { CodegenClientConfig, ExternalGraphQLService, GenericSdkConfig } from '../types'
import { codegen } from '@graphql-codegen/core'
import { preset } from '@graphql-codegen/import-types-preset'
import { plugin as typescriptPlugin } from '@graphql-codegen/typescript'
import { plugin as typescriptGenericSdk } from '@graphql-codegen/typescript-generic-sdk'
import { plugin as typescriptOperations } from '@graphql-codegen/typescript-operations'
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'
import { loadDocuments, loadSchemaSync } from '@graphql-tools/load'
import { UrlLoader } from '@graphql-tools/url-loader'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import { consola } from 'consola'
import { defu } from 'defu'
import { parse } from 'graphql'
import { CurrencyResolver, DateTimeISOResolver, DateTimeResolver, JSONObjectResolver, JSONResolver, NonEmptyStringResolver, UUIDResolver } from 'graphql-scalars'

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
        new UrlLoader(),
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

/**
 * Load schema from external GraphQL service
 */
export async function loadExternalSchema(service: ExternalGraphQLService): Promise<GraphQLSchema | undefined> {
  try {
    const headers = typeof service.headers === 'function' ? service.headers() : service.headers || {}
    const schemas = Array.isArray(service.schema) ? service.schema : [service.schema]

    consola.info(`[graphql:${service.name}] Loading external schema from: ${schemas.join(', ')}`)

    const result = loadSchemaSync(schemas, {
      loaders: [
        new GraphQLFileLoader(),
        new UrlLoader(),
      ],
      ...(Object.keys(headers).length > 0 && {
        headers,
      }),
    })

    consola.info(`[graphql:${service.name}] External schema loaded successfully`)
    return result
  }
  catch (error) {
    consola.error(`[graphql:${service.name}] Failed to load external schema:`, error)
    return undefined
  }
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
  sdkConfig: GenericSdkConfig = {},
  outputPath?: string,
  serviceName?: string,
) {
  if (docs.length === 0) {
    const serviceLabel = serviceName ? `:${serviceName}` : ''
    consola.info(`[graphql${serviceLabel}] No client GraphQL files found. Skipping client type generation.`)
    return false
  }

  const serviceLabel = serviceName ? `:${serviceName}` : ''
  consola.info(`[graphql${serviceLabel}] Found ${docs.length} client GraphQL documents`)

  const defaultConfig: CodegenClientConfig | GenericSdkConfig = {
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
    scalars: {
      DateTime: DateTimeResolver.extensions.codegenScalarType as any,
      DateTimeISO: DateTimeISOResolver.extensions.codegenScalarType as any,
      UUID: UUIDResolver.extensions.codegenScalarType as any,
      JSON: JSONResolver.extensions.codegenScalarType as any,
      JSONObject: JSONObjectResolver.extensions.codegenScalarType as any,
      NonEmptyString: NonEmptyStringResolver.extensions.codegenScalarType as any,
      Currency: CurrencyResolver.extensions.codegenScalarType as any,
      File: {
        input: 'File',
        output: 'File',
      },
    },
  }

  const mergedConfig = defu(defaultConfig, config)

  const mergedSdkConfig = defu(mergedConfig, sdkConfig)

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

    const typesPath = serviceName ? `#graphql/client/${serviceName}` : '#graphql/client'
    const sdkOutput = await preset.buildGeneratesSection({
      baseOutputDir: outputPath || 'client-types.generated.ts',
      schema: parse(printSchemaWithDirectives(schema)),
      documents: [...docs],
      config: mergedSdkConfig,
      presetConfig: {
        typesPath,
      },
      plugins: [
        { pluginContent: {} },
        { typescriptGenericSdk: { } },
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

    // No renaming needed since files will be in separate folders

    return {
      types: output,
      sdk: sdkContent,
    }
  }
  catch (error) {
    consola.warn(`[graphql${serviceLabel}] Client type generation failed:`, error)
    return false
  }
}

/**
 * Generate client types for external GraphQL service
 */
export async function generateExternalClientTypes(
  service: ExternalGraphQLService,
  schema: GraphQLSchema,
  docs: Source[],
): Promise<{ types: string, sdk: string } | false> {
  const config = service.codegen?.client || {}
  const sdkConfig = service.codegen?.clientSDK || {}

  return generateClientTypes(schema, docs, config, sdkConfig, undefined, service.name)
}
