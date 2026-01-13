/**
 * Core Extend Loader
 *
 * Shared logic for loading GraphQL files from packages and local directories.
 * Used by both Nitro module and CLI.
 */

import type { ScannedResolver } from '../types/scanning'
import { dirname, resolve } from 'pathe'
import { glob } from 'tinyglobby'
import { GRAPHQL_GLOB_PATTERN, RESOLVER_GLOB_PATTERN } from '../constants'
import {
  isLocalPath,
  loadPackageConfig,
  parseDirectiveCall,
  parseResolverCall,
  parseSingleFile,
  resolvePackageFiles,
} from '../index'
import { existsSync_ } from '../utils/runtime'

/**
 * Local directory extend source configuration
 */
export interface LocalDirExtendSource {
  serverDir?: string
  clientDir?: string
}

/**
 * Result of scanning an extend source
 */
export interface ExtendScanResult {
  schemas: string[]
  resolvers: ScannedResolver[]
  directives: ScannedResolver[]
  documents: string[]
  configPath?: string
  schemaPath?: string
}

/**
 * Check if source is a LocalDirExtendSource
 */
export function isLocalDirSource(source: unknown): source is LocalDirExtendSource {
  return (
    source !== null
    && typeof source === 'object'
    && ('serverDir' in source || 'clientDir' in source)
    && !('manifest' in source)
    && !('resolvers' in source)
    && !('schemas' in source)
  )
}

/**
 * Resolve extend directories for file watching
 * Returns directories that should be watched for changes
 */
export async function resolveExtendDirs(
  extend: Array<string | object> | undefined,
  rootDir: string,
): Promise<string[]> {
  if (!extend || !Array.isArray(extend) || extend.length === 0) {
    return []
  }

  const dirs: string[] = []

  for (const source of extend) {
    if (typeof source === 'string') {
      // Package name or local path
      const pkg = await loadPackageConfig(source, rootDir)
      if (pkg) {
        const serverDir = resolve(pkg.baseDir, pkg.config.serverDir || 'server/graphql')
        dirs.push(serverDir)

        if (pkg.config.clientDir) {
          const clientDir = resolve(pkg.baseDir, pkg.config.clientDir)
          dirs.push(clientDir)
        }
      }
      else if (isLocalPath(source)) {
        const localDir = resolve(rootDir, source, 'graphql')
        if (existsSync_(localDir)) {
          dirs.push(localDir)
        }
      }
    }
    else if (isLocalDirSource(source)) {
      if (source.serverDir && existsSync_(source.serverDir)) {
        dirs.push(source.serverDir)
      }
      if (source.clientDir && existsSync_(source.clientDir)) {
        dirs.push(source.clientDir)
      }
    }
    else if (source && typeof source === 'object') {
      // Legacy: explicit paths
      const obj = source as { resolvers?: string | string[], schemas?: string | string[] }
      if (obj.schemas) {
        const schemas = Array.isArray(obj.schemas) ? obj.schemas : [obj.schemas]
        for (const schemaPath of schemas) {
          dirs.push(dirname(resolve(rootDir, schemaPath)))
        }
      }
      if (obj.resolvers) {
        const resolvers = Array.isArray(obj.resolvers) ? obj.resolvers : [obj.resolvers]
        for (const resolverPath of resolvers) {
          dirs.push(dirname(resolve(rootDir, resolverPath)))
        }
      }
    }
  }

  return [...new Set(dirs)]
}

/**
 * Scan a single extend source and return the files found
 */
export async function scanExtendSource(
  source: string | object,
  rootDir: string,
): Promise<ExtendScanResult> {
  if (typeof source === 'string') {
    return scanPackageSource(source, rootDir)
  }

  if (isLocalDirSource(source)) {
    return scanLocalDirSource(source)
  }

  if (source && typeof source === 'object') {
    return scanExplicitPaths(source as Record<string, unknown>, rootDir)
  }

  return { schemas: [], resolvers: [], directives: [], documents: [] }
}

/**
 * Scan all extend sources and merge results
 */
export async function scanAllExtendSources(
  extend: Array<string | object> | undefined,
  rootDir: string,
): Promise<ExtendScanResult> {
  if (!extend || !Array.isArray(extend) || extend.length === 0) {
    return { schemas: [], resolvers: [], directives: [], documents: [] }
  }

  const merged: ExtendScanResult = {
    schemas: [],
    resolvers: [],
    directives: [],
    documents: [],
  }

  for (const source of extend) {
    const result = await scanExtendSource(source, rootDir)
    merged.schemas.push(...result.schemas)
    merged.resolvers.push(...result.resolvers)
    merged.directives.push(...result.directives)
    merged.documents.push(...result.documents)
    if (result.configPath)
      merged.configPath = result.configPath
    if (result.schemaPath)
      merged.schemaPath = result.schemaPath
  }

  return merged
}

/**
 * Scan a package for GraphQL files
 */
async function scanPackageSource(
  packageName: string,
  rootDir: string,
): Promise<ExtendScanResult> {
  const pkg = await loadPackageConfig(packageName, rootDir)

  if (!pkg) {
    throw new Error(
      `[nitro-graphql] Config not found for "${packageName}". `
      + `Create a nitro-graphql.config.ts file in the package root.`,
    )
  }

  const files = await resolvePackageFiles(pkg)

  const resolvers: ScannedResolver[] = []
  const directives: ScannedResolver[] = []

  // Parse resolvers
  for (const resolverPath of files.resolvers) {
    const parsed = await parseSingleFile(resolverPath, parseResolverCall)
    if (parsed?.imports.length) {
      resolvers.push(parsed)
    }
  }

  // Parse directives
  for (const directivePath of files.directives) {
    const parsed = await parseSingleFile(directivePath, parseDirectiveCall)
    if (parsed?.imports.length) {
      directives.push(parsed)
    }
  }

  return {
    schemas: files.schemas,
    resolvers,
    directives,
    documents: files.documents,
    configPath: files.configPath,
    schemaPath: files.schemaPath,
  }
}

/**
 * Scan a local directory for GraphQL files
 */
async function scanLocalDirSource(
  source: LocalDirExtendSource,
): Promise<ExtendScanResult> {
  const result: ExtendScanResult = {
    schemas: [],
    resolvers: [],
    directives: [],
    documents: [],
  }

  const ignorePatterns = [
    '**/node_modules/**',
    '**/.git/**',
    '**/.output/**',
    '**/.nitro/**',
    '**/.nuxt/**',
  ]

  // Scan serverDir
  if (source.serverDir && existsSync_(source.serverDir)) {
    // Schemas
    const schemaFiles = await glob(GRAPHQL_GLOB_PATTERN, {
      cwd: source.serverDir,
      absolute: true,
      ignore: ignorePatterns,
    })
    result.schemas.push(...schemaFiles)

    // Resolvers
    const resolverFiles = await glob(RESOLVER_GLOB_PATTERN, {
      cwd: source.serverDir,
      absolute: true,
      ignore: ignorePatterns,
    })
    for (const resolverPath of resolverFiles) {
      const parsed = await parseSingleFile(resolverPath, parseResolverCall)
      if (parsed?.imports.length) {
        result.resolvers.push(parsed)
      }
    }

    // Directives
    const directiveFiles = await glob('**/*.directive.ts', {
      cwd: source.serverDir,
      absolute: true,
      ignore: ignorePatterns,
    })
    for (const directivePath of directiveFiles) {
      const parsed = await parseSingleFile(directivePath, parseDirectiveCall)
      if (parsed?.imports.length) {
        result.directives.push(parsed)
      }
    }
  }

  // Scan clientDir
  if (source.clientDir && existsSync_(source.clientDir)) {
    const documentFiles = await glob(GRAPHQL_GLOB_PATTERN, {
      cwd: source.clientDir,
      absolute: true,
      ignore: ignorePatterns,
    })
    result.documents.push(...documentFiles)
  }

  return result
}

/**
 * Scan explicit paths (legacy format)
 */
async function scanExplicitPaths(
  source: { resolvers?: string | string[], schemas?: string | string[] },
  rootDir: string,
): Promise<ExtendScanResult> {
  const result: ExtendScanResult = {
    schemas: [],
    resolvers: [],
    directives: [],
    documents: [],
  }

  if (source.schemas) {
    const schemas = Array.isArray(source.schemas) ? source.schemas : [source.schemas]
    for (const schemaPath of schemas) {
      result.schemas.push(resolve(rootDir, schemaPath))
    }
  }

  if (source.resolvers) {
    const resolvers = Array.isArray(source.resolvers) ? source.resolvers : [source.resolvers]
    for (const resolverPath of resolvers) {
      const fullPath = resolve(rootDir, resolverPath)
      const parsed = await parseSingleFile(fullPath, parseResolverCall)
      if (parsed?.imports.length) {
        result.resolvers.push(parsed)
      }
    }
  }

  return result
}
