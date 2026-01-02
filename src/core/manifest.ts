/**
 * GraphQL Manifest Loader
 * Loads graphql-manifest.json from packages for extend configuration
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'pathe'
import { resolvePath } from 'mlly'

/**
 * GraphQL manifest structure
 */
export interface GraphQLManifest {
  schemas?: string[]
  resolvers?: string[]
  directives?: string[]
}

/**
 * Resolved manifest with base directory
 */
export interface ResolvedManifest {
  manifest: GraphQLManifest
  baseDir: string
}

/**
 * Resolved extend paths
 */
export interface ResolvedExtend {
  schemas: string[]
  resolvers: string[]
  directives: string[]
}

const MANIFEST_FILENAME = 'graphql-manifest.json'

/**
 * Load manifest from package or path
 * Uses mlly for proper workspace/symlink resolution
 *
 * @param source - Package name or explicit manifest path
 * @param rootDir - Root directory for resolution
 * @returns Resolved manifest with base directory, or null if not found
 */
export async function loadManifest(
  source: string,
  rootDir: string,
): Promise<ResolvedManifest | null> {
  // Explicit manifest path (ends with .json)
  if (source.endsWith('.json')) {
    const manifestPath = resolve(rootDir, source)
    if (existsSync(manifestPath)) {
      const content = readFileSync(manifestPath, 'utf-8')
      return {
        manifest: JSON.parse(content) as GraphQLManifest,
        baseDir: dirname(manifestPath),
      }
    }
    return null
  }

  // Package name - use mlly for proper workspace resolution
  try {
    // mlly properly resolves workspace symlinks
    const pkgPath = await resolvePath(`${source}/package.json`, {
      url: rootDir,
      extensions: ['.json'],
    })
    const pkgDir = dirname(pkgPath)
    const manifestPath = resolve(pkgDir, MANIFEST_FILENAME)

    if (existsSync(manifestPath)) {
      const content = readFileSync(manifestPath, 'utf-8')
      return {
        manifest: JSON.parse(content) as GraphQLManifest,
        baseDir: pkgDir,
      }
    }
  }
  catch {
    // Package not found - will throw error in caller
  }

  return null
}

/**
 * Resolve manifest paths to absolute paths
 *
 * @param manifest - GraphQL manifest
 * @param baseDir - Base directory for path resolution
 * @returns Resolved absolute paths
 */
export function resolveManifestPaths(
  manifest: GraphQLManifest,
  baseDir: string,
): ResolvedExtend {
  return {
    schemas: (manifest.schemas || []).map(p => resolve(baseDir, p)),
    resolvers: (manifest.resolvers || []).map(p => resolve(baseDir, p)),
    directives: (manifest.directives || []).map(p => resolve(baseDir, p)),
  }
}
