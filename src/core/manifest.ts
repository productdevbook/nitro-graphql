/**
 * Package Config Loader
 * Loads package configuration for extend functionality
 */

import { existsSync } from 'node:fs'
import { loadConfig } from 'c12'
import { resolvePath } from 'mlly'
import { dirname, isAbsolute, resolve } from 'pathe'
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
  documents: string[]
  serverDir: string
  clientDir?: string
  /** Path to config.ts if it exists */
  configPath?: string
  /** Path to schema.ts if it exists */
  schemaPath?: string
}

/**
 * Check if source is a local path (relative or absolute)
 */
export function isLocalPath(source: string): boolean {
  return source.startsWith('.') || isAbsolute(source)
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

    const resolvedConfig: PackageConfig = {
      serverDir: config?.serverDir || 'server/graphql',
      clientDir: config?.clientDir,
    }

    // Verify the serverDir exists
    const fullServerDir = resolve(pkgDir, resolvedConfig.serverDir!)
    if (!existsSync(fullServerDir)) {
      return null
    }

    return {
      config: resolvedConfig,
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
  const clientDir = pkg.config.clientDir
    ? resolve(pkg.baseDir, pkg.config.clientDir)
    : undefined

  // Scan for all file types in parallel
  const schemaPattern = `**/*{${GRAPHQL_EXTENSIONS.join(',')}}`
  const resolverPattern = `**/*{${RESOLVER_EXTENSIONS.join(',')}}`
  const directivePattern = `**/*{${DIRECTIVE_EXTENSIONS.join(',')}}`

  const scanPromises: Promise<string[]>[] = [
    glob(schemaPattern, { cwd: serverDir, absolute: true }),
    glob(resolverPattern, { cwd: serverDir, absolute: true }),
    glob(directivePattern, { cwd: serverDir, absolute: true }),
  ]

  // Scan client documents if clientDir is configured and exists
  if (clientDir && existsSync(clientDir)) {
    scanPromises.push(glob(schemaPattern, { cwd: clientDir, absolute: true }))
  }
  else {
    scanPromises.push(Promise.resolve([]))
  }

  const [schemas, resolvers, directives, documents] = await Promise.all(scanPromises)

  // Check for config.ts and schema.ts
  const configPath = resolve(serverDir, 'config.ts')
  const schemaPath = resolve(serverDir, 'schema.ts')

  return {
    schemas: schemas.sort((a, b) => a.localeCompare(b)),
    resolvers: resolvers.sort((a, b) => a.localeCompare(b)),
    directives: directives.sort((a, b) => a.localeCompare(b)),
    documents: documents.sort((a, b) => a.localeCompare(b)),
    serverDir,
    clientDir,
    configPath: existsSync(configPath) ? configPath : undefined,
    schemaPath: existsSync(schemaPath) ? schemaPath : undefined,
  }
}
