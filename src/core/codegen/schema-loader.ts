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

/**
 * Type definition pointer for GraphQL schemas
 */
export type GraphQLTypeDefPointer = UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[]

/**
 * Options for loading GraphQL schemas
 */
export type GraphQLLoadSchemaOptions = Partial<LoadSchemaOptions>

/**
 * Check if a path is a URL
 */
function isUrl(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://')
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
      writeFileIfChanged(schemaFilePath, schemaString)
    }

    return schemaFilePath
  }
  catch {
    return undefined
  }
}
