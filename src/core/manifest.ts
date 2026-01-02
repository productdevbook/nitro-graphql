/**
 * Package Config Loader
 * Loads package configuration for extend functionality
 */

import { existsSync } from 'node:fs'
import { loadConfig } from 'c12'
import { resolvePath } from 'mlly'
import { dirname, resolve } from 'pathe'
import { glob } from 'tinyglobby'
import { DIRECTIVE_EXTENSIONS, GRAPHQL_EXTENSIONS, RESOLVER_EXTENSIONS } from './constants'

/**
 * Package config structure (subset of CLIConfig)
 */
export interface PackageConfig {
  serverDir?: string
  clientDir?: string
}

/**
 * Resolved package with config and base directory
 */
export interface ResolvedPackage {
  config: PackageConfig
  baseDir: string
}

/**
 * Resolved extend paths
 */
export interface ResolvedExtend {
  schemas: string[]
  resolvers: string[]
  directives: string[]
  serverDir: string
}

/**
 * Check if source is a local path (starts with ./ or ../ or /)
 */
function isLocalPath(source: string): boolean {
  return source.startsWith('./') || source.startsWith('../') || source.startsWith('/')
}

/**
 * Load config from package or local directory
 * Uses c12 for proper config loading with TypeScript support
 *
 * @param source - Package name or local path (./path, ../path, /absolute/path)
 * @param rootDir - Root directory for resolution
 * @returns Resolved package with config and base directory, or null if not found
 */
export async function loadPackageConfig(
  source: string,
  rootDir: string,
): Promise<ResolvedPackage | null> {
  try {
    let pkgDir: string

    if (isLocalPath(source)) {
      // Local path - resolve relative to rootDir
      pkgDir = resolve(rootDir, source)
      if (!existsSync(pkgDir)) {
        return null
      }
    }
    else {
      // Package name - resolve using mlly (handles workspace symlinks)
      const pkgPath = await resolvePath(`${source}/package.json`, {
        url: rootDir,
        extensions: ['.json'],
      })
      pkgDir = dirname(pkgPath)
    }

    // Load config using c12
    const { config } = await loadConfig<PackageConfig>({
      name: 'nitro-graphql',
      cwd: pkgDir,
      defaultConfig: {
        serverDir: 'server/graphql',
      },
    })

    const serverDir = config?.serverDir || 'server/graphql'

    // Verify the serverDir exists
    const fullServerDir = resolve(pkgDir, serverDir)
    if (!existsSync(fullServerDir)) {
      return null
    }

    return {
      config: { serverDir },
      baseDir: pkgDir,
    }
  }
  catch {
    // Package not found
    return null
  }
}

/**
 * Scan package's serverDir and resolve all GraphQL files
 *
 * @param pkg - Resolved package with config
 * @returns Resolved file paths
 */
export async function resolvePackageFiles(pkg: ResolvedPackage): Promise<ResolvedExtend> {
  const serverDir = resolve(pkg.baseDir, pkg.config.serverDir || 'server/graphql')

  // Scan for all file types in parallel
  const schemaPattern = `**/*{${GRAPHQL_EXTENSIONS.join(',')}}`
  const resolverPattern = `**/*{${RESOLVER_EXTENSIONS.join(',')}}`
  const directivePattern = `**/*{${DIRECTIVE_EXTENSIONS.join(',')}}`

  const [schemas, resolvers, directives] = await Promise.all([
    glob(schemaPattern, { cwd: serverDir, absolute: true }),
    glob(resolverPattern, { cwd: serverDir, absolute: true }),
    glob(directivePattern, { cwd: serverDir, absolute: true }),
  ])

  return { schemas, resolvers, directives, serverDir }
}
