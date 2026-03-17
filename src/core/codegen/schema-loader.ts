/**
 * Schema loading utilities
 * Load GraphQL schemas from files or URLs
 */

import type { LoadSchemaOptions, UnnormalizedTypeDefPointer } from '@graphql-tools/load'
import type { GraphQLSchema } from 'graphql'
import type { ExternalServiceCodegenConfig } from '../types/codegen'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'
import { loadSchemaSync } from '@graphql-tools/load'
import { UrlLoader } from '@graphql-tools/url-loader'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import { resolve } from 'pathe'
import { writeFileIfChanged } from '../utils/file-io'

export type GraphQLTypeDefPointer = UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[]
export type GraphQLLoadSchemaOptions = Partial<LoadSchemaOptions>

// ============ HELPERS ============

function isUrl(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://')
}

/** Resolve schema sources and headers from service config */
function resolveServiceSources(service: ExternalServiceCodegenConfig) {
  const headers = typeof service.headers === 'function' ? service.headers() : service.headers || {}
  const schemaSource = service.schema ?? service.endpoint
  const schemas = Array.isArray(schemaSource) ? schemaSource : [schemaSource]
  return { headers, schemas }
}

/** Build loaders array based on schema source types */
function buildLoaders(schemas: string[]) {
  const loaders = []
  if (schemas.some(s => !isUrl(s))) loaders.push(new GraphQLFileLoader())
  if (schemas.some(isUrl)) loaders.push(new UrlLoader())
  return loaders
}

/** Load schema with auto-detected loaders and optional headers */
function loadWithLoaders(
  schemas: string[],
  headers: Record<string, string> = {},
): GraphQLSchema {
  const loaders = buildLoaders(schemas)
  if (loaders.length === 0) {
    throw new Error('No appropriate loaders found for schema sources')
  }
  return loadSchemaSync(schemas, {
    loaders,
    ...(Object.keys(headers).length > 0 && { headers }),
  })
}

/** Resolve the cache file path for a service schema */
function resolveSchemaFilePath(service: ExternalServiceCodegenConfig, buildDir: string): string {
  const defaultPath = resolve(buildDir, 'graphql', 'schemas', `${service.name}.graphql`)
  return service.downloadPath ? resolve(service.downloadPath) : defaultPath
}

// ============ PUBLIC API ============

/**
 * Load GraphQL schema synchronously from pointers
 */
export function graphQLLoadSchemaSync(
  schemaPointers: GraphQLTypeDefPointer,
  data: GraphQLLoadSchemaOptions = {},
): GraphQLSchema | undefined {
  const pointers = Array.isArray(schemaPointers) ? schemaPointers : [schemaPointers]

  try {
    return loadSchemaSync([...pointers, '!**/vfs/**'], {
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
    if (error.message?.includes('Unable to find any GraphQL type definitions for the following pointers:')) {
      return undefined
    }
    throw e
  }
}

/**
 * Load schema from external GraphQL service
 */
export async function loadExternalSchema(
  service: ExternalServiceCodegenConfig,
  buildDir?: string,
): Promise<GraphQLSchema | undefined> {
  try {
    const { headers, schemas } = resolveServiceSources(service)

    // Try cached schema first
    if (service.downloadSchema && buildDir) {
      const schemaFilePath = resolveSchemaFilePath(service, buildDir)
      if (existsSync(schemaFilePath)) {
        try {
          return loadSchemaSync([schemaFilePath], { loaders: [new GraphQLFileLoader()] })
        }
        catch {
          // Cached schema invalid, continue to load from source
        }
      }
    }

    return loadWithLoaders(schemas, headers)
  }
  catch {
    return undefined
  }
}

/**
 * Download and save schema from external service
 * Supports modes: true/'once' (download if missing), 'always' (check for updates), 'manual' (skip)
 */
export async function downloadAndSaveSchema(
  service: ExternalServiceCodegenConfig,
  buildDir: string,
): Promise<string | undefined> {
  const downloadMode = service.downloadSchema
  if (!downloadMode || downloadMode === 'manual') {
    return undefined
  }

  const schemaFilePath = resolveSchemaFilePath(service, buildDir)

  try {
    const { headers, schemas } = resolveServiceSources(service)
    const fileExists = existsSync(schemaFilePath)

    // Determine if download is needed
    const shouldDownload = downloadMode === 'always'
      ? !fileExists || needsUpdate(schemas, headers, schemaFilePath)
      : !fileExists // 'once' or true

    if (shouldDownload) {
      const schema = loadWithLoaders(schemas, headers)
      writeFileIfChanged(schemaFilePath, printSchemaWithDirectives(schema))
    }

    return schemaFilePath
  }
  catch {
    return undefined
  }
}

/**
 * Check if a cached schema needs to be updated
 * For URL sources: compare MD5 hashes. For local files: compare mtime.
 */
function needsUpdate(
  schemas: string[],
  headers: Record<string, string>,
  cachedPath: string,
): boolean {
  const hasUrls = schemas.some(isUrl)
  const hasLocal = schemas.some(s => !isUrl(s))

  if (hasUrls) {
    try {
      const remoteSchema = loadSchemaSync(schemas.filter(isUrl), {
        loaders: [new UrlLoader()],
        ...(Object.keys(headers).length > 0 && { headers }),
      })
      const remoteHash = createHash('md5').update(printSchemaWithDirectives(remoteSchema)).digest('hex')
      const localHash = createHash('md5').update(readFileSync(cachedPath, 'utf-8')).digest('hex')
      return remoteHash !== localHash
    }
    catch {
      return true
    }
  }

  if (hasLocal) {
    const cachedStats = statSync(cachedPath)
    return schemas.filter(s => !isUrl(s)).some((localFile) => {
      return existsSync(localFile) && statSync(localFile).mtime > cachedStats.mtime
    })
  }

  return true
}
