/**
 * Core Extend Loader
 *
 * Shared logic for loading GraphQL files from packages and local directories.
 * Used by both Nitro module and CLI.
 */

import type { ScannedResolver } from '../types/scanning'
import consola from 'consola'
import { dirname, resolve } from 'pathe'
import { glob } from 'tinyglobby'
import { DEFAULT_IGNORE_PATTERNS, GRAPHQL_GLOB_PATTERN, RESOLVER_GLOB_PATTERN } from '../constants'
import { isLocalPath, loadPackageConfig, resolvePackageFiles } from '../manifest'
import { parseSingleFile } from '../scanning/ast-scanner'
import { parseDirectiveCall } from '../scanning/directives'
import { parseResolverCall } from '../scanning/resolvers'
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

function emptyResult(): ExtendScanResult {
  return { schemas: [], resolvers: [], directives: [], documents: [] }
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
    return scanExplicitPaths(source as { resolvers?: string | string[], schemas?: string | string[] }, rootDir)
  }

  return emptyResult()
}

/**
 * Scan all extend sources and merge results
 */
export async function scanAllExtendSources(
  extend: Array<string | object> | undefined,
  rootDir: string,
): Promise<ExtendScanResult> {
  if (!extend || !Array.isArray(extend) || extend.length === 0) {
    return emptyResult()
  }

  const merged = emptyResult()

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

// ============ INTERNAL HELPERS ============

async function parseResolverFiles(paths: string[]): Promise<ScannedResolver[]> {
  const results: ScannedResolver[] = []
  for (const filePath of paths) {
    const parsed = await parseSingleFile(filePath, parseResolverCall)
    if (parsed?.imports.length) {
      results.push(parsed)
    }
  }
  return results
}

async function parseDirectiveFiles(paths: string[]): Promise<ScannedResolver[]> {
  const results: ScannedResolver[] = []
  for (const filePath of paths) {
    const parsed = await parseSingleFile(filePath, parseDirectiveCall)
    if (parsed?.imports.length) {
      results.push(parsed)
    }
  }
  return results
}

async function scanPackageSource(
  packageName: string,
  rootDir: string,
): Promise<ExtendScanResult> {
  const pkg = await loadPackageConfig(packageName, rootDir)

  if (!pkg) {
    consola.warn(
      `[nitro-graphql] Config not found for "${packageName}". `
      + `Skipping. Create a nitro-graphql.config.ts file in the package root.`,
    )
    return emptyResult()
  }

  const files = await resolvePackageFiles(pkg)

  return {
    schemas: files.schemas,
    resolvers: await parseResolverFiles(files.resolvers),
    directives: await parseDirectiveFiles(files.directives),
    documents: files.documents,
    configPath: files.configPath,
    schemaPath: files.schemaPath,
  }
}

async function scanLocalDirSource(
  source: LocalDirExtendSource,
): Promise<ExtendScanResult> {
  const result = emptyResult()
  const ignorePatterns = [...DEFAULT_IGNORE_PATTERNS]

  // Scan serverDir
  if (source.serverDir && existsSync_(source.serverDir)) {
    const [schemaFiles, resolverFiles, directiveFiles] = await Promise.all([
      glob(GRAPHQL_GLOB_PATTERN, { cwd: source.serverDir, absolute: true, ignore: ignorePatterns }),
      glob(RESOLVER_GLOB_PATTERN, { cwd: source.serverDir, absolute: true, ignore: ignorePatterns }),
      glob('**/*.directive.ts', { cwd: source.serverDir, absolute: true, ignore: ignorePatterns }),
    ])

    result.schemas.push(...schemaFiles)
    result.resolvers.push(...await parseResolverFiles(resolverFiles))
    result.directives.push(...await parseDirectiveFiles(directiveFiles))
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

async function scanExplicitPaths(
  source: { resolvers?: string | string[], schemas?: string | string[] },
  rootDir: string,
): Promise<ExtendScanResult> {
  const result = emptyResult()

  if (source.schemas) {
    const schemas = Array.isArray(source.schemas) ? source.schemas : [source.schemas]
    result.schemas.push(...schemas.map(s => resolve(rootDir, s)))
  }

  if (source.resolvers) {
    const resolvers = Array.isArray(source.resolvers) ? source.resolvers : [source.resolvers]
    result.resolvers.push(...await parseResolverFiles(resolvers.map(r => resolve(rootDir, r))))
  }

  return result
}
