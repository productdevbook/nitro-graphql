import type { LoadSchemaOptions, UnnormalizedTypeDefPointer } from '@graphql-tools/load'
import type { Source } from '@graphql-tools/utils'
import type { FieldNode, GraphQLSchema, OperationDefinitionNode, SelectionNode } from 'graphql'
import type { CodegenClientConfig, ExternalGraphQLService, GenericSdkConfig } from '../types'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
import { Kind, parse } from 'graphql'
import { CurrencyResolver, DateTimeISOResolver, DateTimeResolver, JSONObjectResolver, JSONResolver, NonEmptyStringResolver, UUIDResolver } from 'graphql-scalars'
import { dirname, resolve } from 'pathe'

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
export async function loadExternalSchema(service: ExternalGraphQLService, buildDir?: string): Promise<GraphQLSchema | undefined> {
  try {
    const headers = typeof service.headers === 'function' ? service.headers() : service.headers || {}
    const schemas = Array.isArray(service.schema) ? service.schema : [service.schema]

    // If downloadSchema is enabled and buildDir is provided, try to use downloaded schema first
    if (service.downloadSchema && buildDir) {
      const defaultPath = resolve(buildDir, 'graphql', 'schemas', `${service.name}.graphql`)
      const schemaFilePath = service.downloadPath ? resolve(service.downloadPath) : defaultPath

      if (existsSync(schemaFilePath)) {
        try {
          const result = loadSchemaSync([schemaFilePath], {
            loaders: [new GraphQLFileLoader()],
          })
          return result
        }
        catch {
          consola.warn(`[graphql:${service.name}] Cached schema invalid, loading from source`)
        }
      }
    }

    // Determine appropriate loaders based on schema sources
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

    const result = loadSchemaSync(schemas, {
      loaders,
      ...(Object.keys(headers).length > 0 && {
        headers,
      }),
    })

    return result
  }
  catch (error) {
    consola.error(`[graphql:${service.name}] Failed to load external schema:`, error)
    return undefined
  }
}

/**
 * Check if a path is a URL (http/https)
 */
function isUrl(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://')
}

/**
 * Download and save schema from external service
 */
export async function downloadAndSaveSchema(service: ExternalGraphQLService, buildDir: string): Promise<string | undefined> {
  const downloadMode = service.downloadSchema

  // Skip if downloading is disabled or manual
  if (!downloadMode || downloadMode === 'manual') {
    return undefined
  }

  // Determine schema file path
  const defaultPath = resolve(buildDir, 'graphql', 'schemas', `${service.name}.graphql`)
  const schemaFilePath = service.downloadPath ? resolve(service.downloadPath) : defaultPath

  try {
    const headers = typeof service.headers === 'function' ? service.headers() : service.headers || {}
    const schemas = Array.isArray(service.schema) ? service.schema : [service.schema]

    // Check if any schemas are local files vs URLs
    const hasUrlSchemas = schemas.some(schema => isUrl(schema))
    const hasLocalSchemas = schemas.some(schema => !isUrl(schema))

    // Determine download behavior based on mode
    let shouldDownload = false
    const fileExists = existsSync(schemaFilePath)

    if (downloadMode === 'always') {
      // Always check for updates (original behavior)
      shouldDownload = true

      if (fileExists && hasUrlSchemas) {
        // Only compare with remote schema if we have URL schemas
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
            consola.info(`[graphql:${service.name}] Schema is up-to-date, using cached version`)
          }
        }
        catch {
          consola.warn(`[graphql:${service.name}] Unable to compare with remote schema, updating local cache`)
          shouldDownload = true
        }
      }
      else if (fileExists && hasLocalSchemas) {
        // For local schemas, check if source files are newer
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
      // Download/copy only if file doesn't exist (offline-friendly)
      shouldDownload = !fileExists

      // File exists, will use cached version
    }

    if (shouldDownload) {
      if (hasUrlSchemas && hasLocalSchemas) {
        // Mixed schemas: load both URL and local schemas
        const schema = loadSchemaSync(schemas, {
          loaders: [new GraphQLFileLoader(), new UrlLoader()],
          ...(Object.keys(headers).length > 0 && { headers }),
        })

        const schemaString = printSchemaWithDirectives(schema)
        mkdirSync(dirname(schemaFilePath), { recursive: true })
        writeFileSync(schemaFilePath, schemaString, 'utf-8')
      }
      else if (hasUrlSchemas) {
        // URL schemas: download from remote
        const schema = loadSchemaSync(schemas, {
          loaders: [new UrlLoader()],
          ...(Object.keys(headers).length > 0 && { headers }),
        })

        const schemaString = printSchemaWithDirectives(schema)
        mkdirSync(dirname(schemaFilePath), { recursive: true })
        writeFileSync(schemaFilePath, schemaString, 'utf-8')
      }
      else if (hasLocalSchemas) {
        // Local schemas: copy/merge local files
        const schema = loadSchemaSync(schemas, {
          loaders: [new GraphQLFileLoader()],
        })

        const schemaString = printSchemaWithDirectives(schema)
        mkdirSync(dirname(schemaFilePath), { recursive: true })
        writeFileSync(schemaFilePath, schemaString, 'utf-8')
      }
    }

    return schemaFilePath
  }
  catch (error) {
    consola.error(`[graphql:${service.name}] Failed to download/copy schema:`, error)
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
  virtualTypesPath?: string,
) {
  // For external services, allow schema-only generation (no documents required)
  if (docs.length === 0 && !serviceName) {
    consola.info('No client GraphQL files found. Skipping client type generation.')
    return false
  }

  const serviceLabel = serviceName ? `:${serviceName}` : ''
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
    // Schema-only generation (no documents)
    if (docs.length === 0) {
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

      // For schema-only generation, create a generic SDK
      const sdkContent = `// THIS FILE IS GENERATED, DO NOT EDIT!
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

      return {
        types: output,
        sdk: sdkContent,
      }
    }

    // Full generation with documents
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

    // Use provided virtual import path, or fall back to default convention
    const typesPath = virtualTypesPath || (serviceName ? `#graphql/client/${serviceName}` : '#graphql/client')
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

    // Generate subscription builder if there are subscriptions
    const subscriptionBuilder = generateSubscriptionBuilder(docs)

    // Combine SDK with subscription builder
    const finalSdkContent = subscriptionBuilder
      ? sdkContent + subscriptionBuilder
      : sdkContent

    return {
      types: output,
      sdk: finalSdkContent,
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
  virtualTypesPath?: string,
): Promise<{ types: string, sdk: string } | false> {
  const config = service.codegen?.client || {}
  const sdkConfig = service.codegen?.clientSDK || {}

  return generateClientTypes(schema, docs, config, sdkConfig, undefined, service.name, virtualTypesPath)
}

/**
 * Convert PascalCase to camelCase
 */
function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

/**
 * Extract subscription info from documents
 */
export interface SubscriptionInfo {
  name: string
  methodName: string
  fieldName: string
  hasVariables: boolean
}

export function extractSubscriptions(docs: Source[]): SubscriptionInfo[] {
  const subscriptions: SubscriptionInfo[] = []

  for (const doc of docs) {
    if (!doc.document)
      continue

    for (const def of doc.document.definitions) {
      if (def.kind === Kind.OPERATION_DEFINITION && def.operation === 'subscription') {
        const operationDef = def as OperationDefinitionNode
        const name = operationDef.name?.value
        if (!name)
          continue

        // Get the first field selection to determine the subscription field name
        const firstSelection = operationDef.selectionSet.selections[0] as SelectionNode
        if (firstSelection.kind !== Kind.FIELD)
          continue

        const fieldName = (firstSelection as FieldNode).name.value
        const hasVariables = (operationDef.variableDefinitions?.length || 0) > 0

        subscriptions.push({
          name,
          methodName: toCamelCase(name),
          fieldName,
          hasVariables,
        })
      }
    }
  }

  return subscriptions
}

/**
 * Generate subscription builder code (Drizzle-style API) + Vue Composables
 */
export function generateSubscriptionBuilder(docs: Source[]): string {
  const subscriptions = extractSubscriptions(docs)
  if (subscriptions.length === 0)
    return ''

  let output = `
// === Subscription Imports ===
import { ref, onUnmounted, computed } from 'vue'
import type { Ref } from 'vue'
import {
  subscriptionClient,
  type SubscriptionHandle,
  type SubscriptionSession,
  type ConnectionState,
} from './subscribe'

// === Subscription Types ===
export type { ConnectionState, SubscriptionHandle, SubscriptionSession }

// Forward declaration for UseSubscriptionSessionReturn (defined below)
export interface UseSubscriptionSessionReturn {
  /** The underlying session object */
  session: SubscriptionSession
  /** Subscribe using the shared session (updates reactive refs) */
  subscribe: <TData = unknown>(
    query: string,
    variables: unknown,
    onData?: (data: TData) => void,
    onError?: (error: Error) => void,
  ) => SubscriptionHandle
  /** Close all subscriptions and the connection */
  close: () => void
  /** Is the session connected (reactive) */
  isConnected: Ref<boolean>
  /** Current connection state (reactive) */
  state: Ref<ConnectionState>
  /** Number of active subscriptions (reactive) */
  subscriptionCount: Ref<number>
}

export interface UseSubscriptionOptions<T> {
  /** Auto-start subscription on mount (default: false) */
  immediate?: boolean
  /** Callback when subscription starts */
  onStart?: () => void
  /** Callback when subscription stops */
  onStop?: () => void
  /** Callback when data is received */
  onData?: (data: T) => void
  /** Callback when error occurs */
  onError?: (error: Error) => void
  /** Callback when WebSocket connects */
  onConnected?: () => void
  /** Callback when WebSocket reconnects */
  onReconnected?: () => void
  /** Callback when WebSocket disconnects */
  onDisconnected?: () => void
  /** Callback when connection state changes */
  onStateChange?: (state: ConnectionState) => void
  /** Use existing session for multiplexing (pass result from useSubscriptionSession) */
  session?: UseSubscriptionSessionReturn
}

export interface UseSubscriptionReturn<T> {
  /** Reactive subscription data */
  data: Ref<T | null>
  /** Reactive error state */
  error: Ref<Error | null>
  /** Is subscription active */
  isActive: Ref<boolean>
  /** Connection state */
  state: Ref<ConnectionState>
  /** Start subscription */
  start: () => void
  /** Stop subscription */
  stop: () => void
  /** Restart subscription */
  restart: () => void
}

// === Subscription Builder (Drizzle-style API) ===
interface SubscriptionBuilder<TData> {
  onData(fn: (data: TData) => void): SubscriptionBuilder<TData>
  onError(fn: (error: Error) => void): SubscriptionBuilder<TData>
  start(): SubscriptionHandle
  subscribe(fn: (data: TData) => void): SubscriptionHandle
}

function createSubscriptionBuilder<TData>(query: string, variables: unknown): SubscriptionBuilder<TData> {
  let onDataFn: ((data: TData) => void) | undefined
  let onErrorFn: ((error: Error) => void) | undefined

  const builder: SubscriptionBuilder<TData> = {
    onData(fn: (data: TData) => void) {
      onDataFn = fn
      return builder
    },
    onError(fn: (error: Error) => void) {
      onErrorFn = fn
      return builder
    },
    start(): SubscriptionHandle {
      return subscriptionClient.subscribe(query, variables, onDataFn, onErrorFn)
    },
    subscribe(fn: (data: TData) => void): SubscriptionHandle {
      return subscriptionClient.subscribe(query, variables, fn, undefined)
    },
  }

  return builder
}

export const subscription = {
`

  // Generate Drizzle-style subscription methods
  for (const sub of subscriptions) {
    if (sub.hasVariables) {
      output += `  ${sub.methodName}(variables: Types.${sub.name}SubscriptionVariables): SubscriptionBuilder<Types.${sub.name}Subscription['${sub.fieldName}']> {
    return createSubscriptionBuilder<Types.${sub.name}Subscription['${sub.fieldName}']>(${sub.name}Document, variables)
  },
`
    }
    else {
      output += `  ${sub.methodName}(): SubscriptionBuilder<Types.${sub.name}Subscription['${sub.fieldName}']> {
    return createSubscriptionBuilder<Types.${sub.name}Subscription['${sub.fieldName}']>(${sub.name}Document, undefined)
  },
`
    }
  }

  output += `}

// === Framework-Agnostic Session (for non-Vue usage) ===
/**
 * Create a multiplexed subscription session (framework-agnostic)
 * All subscriptions share a single WebSocket connection.
 *
 * @example
 * // Vanilla JS / Node.js / React / etc.
 * const session = createSubscriptionSession()
 * const sub1 = session.subscribe(query1, vars1, onData1)
 * const sub2 = session.subscribe(query2, vars2, onData2)
 * // Both use the same WebSocket connection
 * sub1.unsubscribe()
 * session.close() // Close all
 *
 * @returns SubscriptionSession - Framework-agnostic session object
 */
export function createSubscriptionSession(): SubscriptionSession {
  return subscriptionClient.createSession()
}

// === Vue Composable: useSubscriptionSession (Multiplexing) ===
export interface UseSubscriptionSessionReturn {
  /** The underlying session object */
  session: SubscriptionSession
  /** Subscribe using the shared session */
  subscribe: <TData = unknown>(
    query: string,
    variables: unknown,
    onData?: (data: TData) => void,
    onError?: (error: Error) => void,
  ) => SubscriptionHandle
  /** Close all subscriptions and the connection */
  close: () => void
  /** Is the session connected (reactive) */
  isConnected: Ref<boolean>
  /** Current connection state (reactive) */
  state: Ref<ConnectionState>
  /** Number of active subscriptions (reactive) */
  subscriptionCount: Ref<number>
}

/**
 * Vue composable for multiplexed subscription session
 * Provides reactive state and automatic cleanup on unmount.
 *
 * @example
 * // Vue 3 component
 * const session = useSubscriptionSession()
 * const { data } = useCountdown({ from: 10 }, { session })
 * // Session auto-closes on component unmount
 *
 * @returns UseSubscriptionSessionReturn - Vue-reactive session wrapper
 */
export function useSubscriptionSession(): UseSubscriptionSessionReturn {
  const session = subscriptionClient.createSession()

  // Use refs for reactivity (session getters are not reactive)
  const isConnected = ref(session.isConnected)
  const state = ref<ConnectionState>(session.state)
  const subscriptionCount = ref(session.subscriptionCount)

  // Update refs when session state changes
  function updateRefs() {
    isConnected.value = session.isConnected
    state.value = session.state
    subscriptionCount.value = session.subscriptionCount
  }

  // Subscribe to session state changes for automatic reactivity
  const unsubscribeStateChange = session.onStateChange(() => {
    updateRefs()
  })

  function subscribe<TData = unknown>(
    query: string,
    variables: unknown,
    onData?: (data: TData) => void,
    onError?: (error: Error) => void,
  ): SubscriptionHandle {
    return session.subscribe(query, variables, onData as (data: unknown) => void, onError)
  }

  function close() {
    session.close()
  }

  onUnmounted(() => {
    unsubscribeStateChange()
    close()
  })

  return {
    session,
    subscribe,
    close,
    isConnected,
    state,
    subscriptionCount,
  }
}

// === Vue Composables ===
function createUseSubscription<TData, TVariables = undefined>(
  query: string,
  getVariables: () => TVariables,
): (options?: UseSubscriptionOptions<TData>) => UseSubscriptionReturn<TData> {
  return (options: UseSubscriptionOptions<TData> = {}): UseSubscriptionReturn<TData> => {
    const data = ref<TData | null>(null) as Ref<TData | null>
    const error = ref<Error | null>(null)
    const isActive = ref(false)
    const state = ref<ConnectionState>('idle')
    let handle: SubscriptionHandle | null = null

    function start() {
      stop()
      isActive.value = true
      error.value = null
      options.onStart?.()

      const variables = getVariables()

      if (options.session) {
        // Use existing session for multiplexing
        handle = options.session.subscribe<TData>(
          query,
          variables,
          (d: TData) => {
            data.value = d
            options.onData?.(d)
          },
          (e: Error) => {
            error.value = e
            options.onError?.(e)
          },
        )
      } else {
        // Create dedicated connection
        handle = subscriptionClient.subscribe<TData>(
          query,
          variables,
          (d: TData) => {
            data.value = d
            options.onData?.(d)
          },
          (e: Error) => {
            error.value = e
            options.onError?.(e)
          },
        )
      }
    }

    function stop() {
      if (handle) {
        handle.unsubscribe()
        handle = null
        isActive.value = false
        options.onStop?.()
      }
    }

    function restart() {
      stop()
      start()
    }

    if (options.immediate) {
      start()
    }

    onUnmounted(stop)

    return { data, error, isActive, state, start, stop, restart }
  }
}

// === Subscription Return Types ===
`

  // Generate type aliases for each subscription composable
  for (const sub of subscriptions) {
    const typeName = `Types.${sub.name}Subscription['${sub.fieldName}']`
    output += `/** Return type for use${sub.name} composable */
export type Use${sub.name}Return = UseSubscriptionReturn<${typeName}>
`
  }

  output += `
// === Vue Composables ===
`

  // Generate individual composables for each subscription
  for (const sub of subscriptions) {
    const typeName = `Types.${sub.name}Subscription['${sub.fieldName}']`
    const varsType = `Types.${sub.name}SubscriptionVariables`

    if (sub.hasVariables) {
      output += `/**
 * Vue composable for ${sub.name} subscription
 * @param variables - Subscription variables
 * @param options - Subscription options (immediate, onData, onError, session, etc.)
 * @returns Reactive subscription state: { data, error, isActive, state, start, stop, restart }
 */
export function use${sub.name}(
  variables: ${varsType},
  options?: UseSubscriptionOptions<${typeName}>,
): Use${sub.name}Return {
  return createUseSubscription<${typeName}, ${varsType}>(
    ${sub.name}Document,
    () => variables,
  )(options)
}

`
    }
    else {
      output += `/**
 * Vue composable for ${sub.name} subscription
 * @param options - Subscription options (immediate, onData, onError, session, etc.)
 * @returns Reactive subscription state: { data, error, isActive, state, start, stop, restart }
 */
export function use${sub.name}(
  options?: UseSubscriptionOptions<${typeName}>,
): Use${sub.name}Return {
  return createUseSubscription<${typeName}, undefined>(
    ${sub.name}Document,
    () => undefined,
  )(options)
}

`
    }
  }

  return output
}
