import type { DocumentNode } from 'graphql'
import type { Requester } from './sdk'
import { FetchError, ofetch } from 'ofetch'
import { getSdk } from './sdk'

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface GraphQLResponse<T = any> {
  data?: T
  errors?: GraphQLError[]
}

interface GraphQLError {
  message: string
  extensions?: Record<string, any>
  path?: (string | number)[]
  locations?: Array<{
    line: number
    column: number
  }>
}

interface RequestConfig {
  endpoint: string
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>)
  timeout?: number
  retry?: number | false
  throwOnErrors?: boolean
}

interface GraphQLClientConfig extends Omit<RequestConfig, 'endpoint'> {
  endpoint?: string
  type?: 'json' | 'stream' | 'upload'
}

// ============================================================================
// Error Classes
// ============================================================================

class GraphQLClientError extends Error {
  public readonly errors?: GraphQLError[]
  public readonly response?: any
  public readonly networkError?: boolean

  constructor(message: string, options?: {
    errors?: GraphQLError[]
    response?: any
    networkError?: boolean
  }) {
    super(message)
    this.name = 'GraphQLClientError'
    this.errors = options?.errors
    this.response = options?.response
    this.networkError = options?.networkError ?? false
  }

  hasError(code: string): boolean {
    return this.errors?.some(e => e.extensions?.code === code) ?? false
  }

  getError(code: string): GraphQLError | undefined {
    return this.errors?.find(e => e.extensions?.code === code)
  }
}

// ============================================================================
// Utilities
// ============================================================================

const DEFAULT_ENDPOINT = process.env.NUXT_PUBLIC_GRAPHQL_ENDPOINT
  || process.env.GRAPHQL_ENDPOINT
  || 'http://localhost:3000/api/graphql'

const DEFAULT_TIMEOUT = 30000

async function resolveHeaders(
  headers?: RequestConfig['headers'],
): Promise<Record<string, string>> {
  if (!headers)
    return {}
  return typeof headers === 'function' ? await headers() : headers
}

function getRequestHeaders(): Record<string, string> {
  // SSR context headers
  if (import.meta.server && typeof useRequestHeaders === 'function') {
    try {
      return useRequestHeaders(['cookie', 'authorization', 'user-agent'])
    }
    catch {
      // Fallback if not in Nuxt context
    }
  }
  return {}
}

function parseDocument(doc: string | DocumentNode): string {
  return typeof doc === 'string' ? doc : doc.loc?.source.body || ''
}

// ============================================================================
// Base Requester Factory
// ============================================================================

function createBaseRequester(config: RequestConfig) {
  const {
    endpoint,
    headers,
    timeout = DEFAULT_TIMEOUT,
    retry = 0,
    throwOnErrors = true,
  } = config

  return {
    endpoint,
    timeout,
    retry: retry === false ? 0 : retry,
    throwOnErrors,
    async getHeaders(additionalHeaders?: Record<string, string>) {
      const baseHeaders = {
        'Content-Type': 'application/json',
        ...getRequestHeaders(),
        ...await resolveHeaders(headers),
        ...additionalHeaders,
      }
      return baseHeaders
    },
  }
}

// ============================================================================
// JSON Requester (Queries & Mutations)
// ============================================================================

function createOfetchRequester(
  endpointOrConfig: string | RequestConfig,
): Requester {
  const config = typeof endpointOrConfig === 'string'
    ? { endpoint: endpointOrConfig }
    : endpointOrConfig

  const base = createBaseRequester(config)

  return async (doc, vars) => {
    try {
      const result = await ofetch<GraphQLResponse>(base.endpoint, {
        method: 'POST',
        body: {
          query: parseDocument(doc),
          variables: vars,
        },
        headers: await base.getHeaders(),
        timeout: base.timeout,
        retry: base.retry,
      })

      if (result.errors?.length && base.throwOnErrors) {
        throw new GraphQLClientError(
          result.errors.map(e => e.message).join('; '),
          { errors: result.errors, response: result },
        )
      }

      return result.data
    }
    catch (error) {
      if (error instanceof GraphQLClientError)
        throw error

      if (error instanceof FetchError) {
        throw new GraphQLClientError(
          `Network error: ${error.message}`,
          {
            response: error.data,
            networkError: true,
          },
        )
      }

      throw error
    }
  }
}

// ============================================================================
// SSE Stream Requester (Subscriptions)
// ============================================================================

function createOfetchStreamRequester(
  endpointOrConfig: string | RequestConfig,
): Requester {
  const config = typeof endpointOrConfig === 'string'
    ? { endpoint: endpointOrConfig }
    : endpointOrConfig

  const base = createBaseRequester(config)

  return async function* (doc, vars) {
    const controller = new AbortController()
    let timeoutId: NodeJS.Timeout | undefined

    // Cleanup function
    const cleanup = () => {
      controller.abort()
      if (timeoutId)
        clearTimeout(timeoutId)
    }

    // Setup timeout
    if (base.timeout) {
      timeoutId = setTimeout(() => {
        cleanup()
        throw new GraphQLClientError('Stream timeout', { networkError: true })
      }, base.timeout)
    }

    try {
      const response = await ofetch.raw(base.endpoint, {
        method: 'POST',
        headers: await base.getHeaders({
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        }),
        body: {
          query: parseDocument(doc),
          variables: vars,
        },
        responseType: 'stream',
        signal: controller.signal,
      })

      if (!response._data) {
        throw new GraphQLClientError('No stream data received', { networkError: true })
      }

      const reader = response._data.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done)
            break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()

            // Skip empty lines, comments, and event types
            if (!trimmed || trimmed.startsWith(':') || trimmed.startsWith('event:')) {
              continue
            }

            // Handle SSE data
            if (trimmed.startsWith('data: ')) {
              const data = trimmed.slice(6)

              // Handle completion signals
              if (data === '[DONE]' || data === 'done') {
                return
              }

              try {
                const parsed = JSON.parse(data) as GraphQLResponse

                if (parsed.errors?.length && base.throwOnErrors) {
                  throw new GraphQLClientError(
                    parsed.errors.map(e => e.message).join('; '),
                    { errors: parsed.errors, response: parsed },
                  )
                }

                if (parsed.data !== undefined) {
                  yield parsed.data
                }
              }
              catch (e) {
                if (e instanceof GraphQLClientError)
                  throw e
                // Silently skip unparseable data
                if (import.meta.dev) {
                  console.warn('[GraphQL Stream] Failed to parse:', data, e)
                }
              }
            }
          }
        }
      }
      finally {
        reader.releaseLock()
      }
    }
    catch (error) {
      if (error instanceof GraphQLClientError)
        throw error

      if (error instanceof FetchError) {
        throw new GraphQLClientError(
          `Stream error: ${error.message}`,
          {
            response: error.data,
            networkError: true,
          },
        )
      }

      throw error
    }
    finally {
      cleanup()
    }
  }
}

// ============================================================================
// File Upload Requester (Multipart)
// ============================================================================

interface FileMap {
  files: Map<string, File | Blob>
  mapping: Record<string, string[]>
}

function extractFiles(
  obj: any,
  path: string = 'variables',
  fileMap: FileMap = { files: new Map(), mapping: {} },
): any {
  if (obj instanceof File || obj instanceof Blob) {
    const index = fileMap.files.size.toString()
    fileMap.files.set(index, obj)

    if (!fileMap.mapping[index]) {
      fileMap.mapping[index] = []
    }
    fileMap.mapping[index].push(path)

    return null
  }

  if (Array.isArray(obj)) {
    return obj.map((item, i) =>
      extractFiles(item, `${path}[${i}]`, fileMap),
    )
  }

  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = extractFiles(value, `${path}.${key}`, fileMap)
    }
    return result
  }

  return obj
}

function createOfetchUploadRequester(
  endpointOrConfig: string | RequestConfig,
): Requester {
  const config = typeof endpointOrConfig === 'string'
    ? { endpoint: endpointOrConfig }
    : endpointOrConfig

  const base = createBaseRequester(config)

  return async (doc, vars) => {
    const formData = new FormData()
    const fileMap: FileMap = { files: new Map(), mapping: {} }

    // Extract files from variables
    const variables = vars ? extractFiles(vars, 'variables', fileMap) : undefined

    // Build multipart request according to GraphQL multipart spec
    const operations = {
      query: parseDocument(doc),
      variables,
    }

    formData.append('operations', JSON.stringify(operations))

    // Only add map if files exist
    if (fileMap.files.size > 0) {
      formData.append('map', JSON.stringify(fileMap.mapping))

      // Append files in order
      for (const [index, file] of fileMap.files) {
        formData.append(index, file)
      }
    }

    try {
      const headers = await base.getHeaders()
      // Let browser set multipart boundary
      const { 'Content-Type': _, ...headersWithoutContentType } = headers

      const result = await ofetch<GraphQLResponse>(base.endpoint, {
        method: 'POST',
        body: formData,
        headers: headersWithoutContentType,
        timeout: base.timeout,
        retry: base.retry,
      })

      if (result.errors?.length && base.throwOnErrors) {
        throw new GraphQLClientError(
          result.errors.map(e => e.message).join('; '),
          { errors: result.errors, response: result },
        )
      }

      return result.data
    }
    catch (error) {
      if (error instanceof GraphQLClientError)
        throw error

      if (error instanceof FetchError) {
        throw new GraphQLClientError(
          `Upload error: ${error.message}`,
          {
            response: error.data,
            networkError: true,
          },
        )
      }

      throw error
    }
  }
}

// ============================================================================
// Client Factory
// ============================================================================

function createGraphQLClient(config: GraphQLClientConfig = {}) {
  const {
    endpoint = DEFAULT_ENDPOINT,
    type = 'json',
    ...requestConfig
  } = config

  const finalConfig: RequestConfig = {
    ...requestConfig,
    endpoint,
  }

  switch (type) {
    case 'stream':
      return getSdk(createOfetchStreamRequester(finalConfig))
    case 'upload':
      return getSdk(createOfetchUploadRequester(finalConfig))
    default:
      return getSdk(createOfetchRequester(finalConfig))
  }
}

// ============================================================================
// Composables
// ============================================================================

let defaultClient: ReturnType<typeof getSdk> | null = null

export function useGraphQL(config?: GraphQLClientConfig) {
  if (config) {
    return createGraphQLClient(config)
  }

  // Return singleton default client
  if (!defaultClient) {
    defaultClient = createGraphQLClient()
  }

  return defaultClient
}
