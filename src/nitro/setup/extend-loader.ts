/**
 * Extend configuration loader
 * Loads nitro-graphql.config.ts from packages and scans their serverDir
 */

import type { Nitro } from 'nitro/types'
import type { LocalDirExtendSource } from '../types'
import { existsSync } from 'node:fs'
import consola from 'consola'
import { dirname, resolve } from 'pathe'
import { glob } from 'tinyglobby'
import {
  isLocalPath,
  loadPackageConfig,
  parseDirectiveCall,
  parseResolverCall,
  parseSingleFile,
  resolvePackageFiles,
} from '../../core'
import { GRAPHQL_GLOB_PATTERN, LOG_TAG, RESOLVER_GLOB_PATTERN } from '../../core/constants'
import { generateDirectiveSchemas } from '../../core/utils/directive-parser'

const logger = consola.withTag(LOG_TAG)

/**
 * Check if source is a LocalDirExtendSource
 */
function isLocalDirSource(source: unknown): source is LocalDirExtendSource {
  return (
    source !== null
    && typeof source === 'object'
    && ('serverDir' in source || 'clientDir' in source)
    && !('manifest' in source)
    && !('resolvers' in source)
    && !('schemas' in source)
  )
}

interface ExtendResult {
  schemas: number
  resolvers: number
  directives: number
  documents: number
  hasConfig: boolean
  hasSchema: boolean
}

/**
 * Resolve extend directories for file watching
 * Called early in setup (before watcher) to get directories to watch
 */
export async function resolveExtendDirs(nitro: Nitro): Promise<string[]> {
  const extend = nitro.options.graphql?.extend
  if (!extend || !Array.isArray(extend) || extend.length === 0)
    return []

  const dirs: string[] = []

  for (const source of extend) {
    if (typeof source === 'string') {
      // Package name or local path - load config and get serverDir/clientDir
      const pkg = await loadPackageConfig(source, nitro.options.rootDir)
      if (pkg) {
        const serverDir = resolve(pkg.baseDir, pkg.config.serverDir || 'server/graphql')
        dirs.push(serverDir)

        // Also add clientDir if configured
        if (pkg.config.clientDir) {
          const clientDir = resolve(pkg.baseDir, pkg.config.clientDir)
          dirs.push(clientDir)
        }
      }
      else if (isLocalPath(source)) {
        // Local path without config - use default serverDir
        const localDir = resolve(nitro.options.rootDir, source, 'graphql')
        if (existsSync(localDir)) {
          dirs.push(localDir)
        }
      }
    }
    else if (isLocalDirSource(source)) {
      // LocalDirExtendSource: explicit serverDir/clientDir
      if (source.serverDir && existsSync(source.serverDir)) {
        dirs.push(source.serverDir)
      }
      if (source.clientDir && existsSync(source.clientDir)) {
        dirs.push(source.clientDir)
      }
    }
    else if (source && typeof source === 'object') {
      // Legacy: explicit paths - get parent directories
      const obj = source as { resolvers?: string | string[], schemas?: string | string[] }
      if (obj.schemas) {
        const schemas = Array.isArray(obj.schemas) ? obj.schemas : [obj.schemas]
        for (const schemaPath of schemas) {
          dirs.push(dirname(resolve(nitro.options.rootDir, schemaPath)))
        }
      }
      if (obj.resolvers) {
        const resolvers = Array.isArray(obj.resolvers) ? obj.resolvers : [obj.resolvers]
        for (const resolverPath of resolvers) {
          dirs.push(dirname(resolve(nitro.options.rootDir, resolverPath)))
        }
      }
    }
  }

  // Remove duplicates
  return [...new Set(dirs)]
}

interface ResolveExtendOptions {
  silent?: boolean
}

/**
 * Resolve extend configuration and add files to scan results
 * Must be called AFTER scanGraphQLFiles to append to results
 */
export async function resolveExtendConfig(nitro: Nitro, options: ResolveExtendOptions = {}): Promise<void> {
  const extend = nitro.options.graphql?.extend
  if (!extend || !Array.isArray(extend) || extend.length === 0)
    return

  let schemasAdded = 0
  let resolversAdded = 0
  let directivesAdded = 0
  let documentsAdded = 0
  let configsAdded = 0
  let programmaticSchemasAdded = 0

  for (const source of extend) {
    const result = await processExtendSource(source, nitro, options.silent)
    schemasAdded += result.schemas
    resolversAdded += result.resolvers
    directivesAdded += result.directives
    documentsAdded += result.documents
    if (result.hasConfig)
      configsAdded++
    if (result.hasSchema)
      programmaticSchemasAdded++
  }

  // Regenerate directive schemas if any directives were added from extends
  if (directivesAdded > 0) {
    const directiveSchemas = await generateDirectiveSchemas(nitro.scanDirectives, nitro.graphql.buildDir)
    nitro.graphql.directiveSchemas = directiveSchemas
  }

  if (!options.silent && (schemasAdded > 0 || resolversAdded > 0 || directivesAdded > 0 || documentsAdded > 0 || configsAdded > 0 || programmaticSchemasAdded > 0)) {
    const parts = []
    if (schemasAdded > 0)
      parts.push(`${schemasAdded} schema(s)`)
    if (resolversAdded > 0)
      parts.push(`${resolversAdded} resolver(s)`)
    if (directivesAdded > 0)
      parts.push(`${directivesAdded} directive(s)`)
    if (documentsAdded > 0)
      parts.push(`${documentsAdded} document(s)`)
    if (configsAdded > 0)
      parts.push(`${configsAdded} config(s)`)
    if (programmaticSchemasAdded > 0)
      parts.push(`${programmaticSchemasAdded} programmatic schema(s)`)
    logger.info(`Extended with ${parts.join(', ')}`)
  }
}

/**
 * Process a single extend source (package name or explicit config)
 */
async function processExtendSource(
  source: string | object,
  nitro: Nitro,
  silent?: boolean,
): Promise<ExtendResult> {
  if (typeof source === 'string') {
    return loadFromPackage(source, nitro, silent)
  }

  if (isLocalDirSource(source)) {
    return processLocalDirSource(source, nitro)
  }

  if (source && typeof source === 'object') {
    return processExplicitPaths(source as Record<string, unknown>, nitro)
  }

  return { schemas: 0, resolvers: 0, directives: 0, documents: 0, hasConfig: false, hasSchema: false }
}

/**
 * Load and scan files from a package's nitro-graphql.config.ts
 */
async function loadFromPackage(
  packageName: string,
  nitro: Nitro,
  silent?: boolean,
): Promise<ExtendResult> {
  const pkg = await loadPackageConfig(packageName, nitro.options.rootDir)

  if (!pkg) {
    throw new Error(
      `[nitro-graphql] Config not found for "${packageName}". `
      + `Create a nitro-graphql.config.ts file in the package root.`,
    )
  }

  // Scan the package's serverDir for GraphQL files
  const files = await resolvePackageFiles(pkg)

  if (!silent) {
    logger.info(`Loaded config from ${packageName}`)
  }

  return addPackageFiles(files, nitro)
}

/**
 * Add files from a resolved package to scan results
 */
async function addPackageFiles(
  files: { schemas: string[], resolvers: string[], directives: string[], documents: string[], configPath?: string, schemaPath?: string },
  nitro: Nitro,
): Promise<ExtendResult> {
  let schemasAdded = 0
  let resolversAdded = 0
  let directivesAdded = 0
  let documentsAdded = 0
  let hasConfig = false
  let hasSchema = false

  // Add schemas
  for (const schemaPath of files.schemas) {
    if (!nitro.scanSchemas.includes(schemaPath)) {
      nitro.scanSchemas.push(schemaPath)
      schemasAdded++
    }
  }

  // Parse and add resolvers (check for duplicates by specifier)
  for (const resolverPath of files.resolvers) {
    const alreadyExists = nitro.scanResolvers.some(r => r.specifier === resolverPath)
    if (alreadyExists)
      continue

    const parsed = await parseSingleFile(resolverPath, parseResolverCall)
    if (parsed?.imports.length) {
      nitro.scanResolvers.push(parsed)
      resolversAdded++
    }
  }

  // Parse and add directives (check for duplicates by specifier)
  for (const directivePath of files.directives) {
    const alreadyExists = nitro.scanDirectives.some(d => d.specifier === directivePath)
    if (alreadyExists)
      continue

    const parsed = await parseSingleFile(directivePath, parseDirectiveCall)
    if (parsed?.imports.length) {
      nitro.scanDirectives.push(parsed)
      directivesAdded++
    }
  }

  // Add client documents
  for (const docPath of files.documents) {
    if (!nitro.scanDocuments.includes(docPath)) {
      nitro.scanDocuments.push(docPath)
      documentsAdded++
    }
  }

  // Add config.ts path if exists
  if (files.configPath && !nitro.graphql.extendConfigs.includes(files.configPath)) {
    nitro.graphql.extendConfigs.push(files.configPath)
    hasConfig = true
  }

  // Add schema.ts path if exists
  if (files.schemaPath && !nitro.graphql.extendSchemas.includes(files.schemaPath)) {
    nitro.graphql.extendSchemas.push(files.schemaPath)
    hasSchema = true
  }

  return { schemas: schemasAdded, resolvers: resolversAdded, directives: directivesAdded, documents: documentsAdded, hasConfig, hasSchema }
}

/**
 * Process explicit paths (legacy format)
 */
async function processExplicitPaths(
  source: { resolvers?: string | string[], schemas?: string | string[] },
  nitro: Nitro,
): Promise<ExtendResult> {
  let schemasAdded = 0
  let resolversAdded = 0

  if (source.schemas) {
    const schemas = Array.isArray(source.schemas) ? source.schemas : [source.schemas]
    for (const schemaPath of schemas) {
      const fullPath = resolve(nitro.options.rootDir, schemaPath)
      if (!nitro.scanSchemas.includes(fullPath)) {
        nitro.scanSchemas.push(fullPath)
        schemasAdded++
      }
    }
  }

  if (source.resolvers) {
    const resolvers = Array.isArray(source.resolvers) ? source.resolvers : [source.resolvers]
    for (const resolverPath of resolvers) {
      const fullPath = resolve(nitro.options.rootDir, resolverPath)
      const alreadyExists = nitro.scanResolvers.some(r => r.specifier === fullPath)
      if (alreadyExists)
        continue

      const parsed = await parseSingleFile(fullPath, parseResolverCall)
      if (parsed?.imports.length) {
        nitro.scanResolvers.push(parsed)
        resolversAdded++
      }
    }
  }

  // Legacy format doesn't support directives, documents, configs, or schemas
  return { schemas: schemasAdded, resolvers: resolversAdded, directives: 0, documents: 0, hasConfig: false, hasSchema: false }
}

/**
 * Process LocalDirExtendSource - scan serverDir and clientDir for GraphQL files
 * Used for Nuxt layers and local directory extends
 */
async function processLocalDirSource(
  source: LocalDirExtendSource,
  nitro: Nitro,
): Promise<ExtendResult> {
  let schemasAdded = 0
  let resolversAdded = 0
  let directivesAdded = 0
  let documentsAdded = 0

  const ignorePatterns = [
    '**/node_modules/**',
    '**/.git/**',
    '**/.output/**',
    '**/.nitro/**',
    '**/.nuxt/**',
  ]

  // Scan serverDir for schemas, resolvers, and directives
  if (source.serverDir && existsSync(source.serverDir)) {
    // Scan schemas (.graphql files)
    const schemaFiles = await glob(GRAPHQL_GLOB_PATTERN, {
      cwd: source.serverDir,
      absolute: true,
      ignore: ignorePatterns,
    })

    for (const schemaPath of schemaFiles) {
      if (!nitro.scanSchemas.includes(schemaPath)) {
        nitro.scanSchemas.push(schemaPath)
        schemasAdded++
      }
    }

    // Scan resolvers (.resolver.ts files)
    const resolverFiles = await glob(RESOLVER_GLOB_PATTERN, {
      cwd: source.serverDir,
      absolute: true,
      ignore: ignorePatterns,
    })

    for (const resolverPath of resolverFiles) {
      const alreadyExists = nitro.scanResolvers.some(r => r.specifier === resolverPath)
      if (alreadyExists)
        continue

      const parsed = await parseSingleFile(resolverPath, parseResolverCall)
      if (parsed?.imports.length) {
        nitro.scanResolvers.push(parsed)
        resolversAdded++
      }
    }

    // Scan directives (.directive.ts files)
    const directiveFiles = await glob('**/*.directive.ts', {
      cwd: source.serverDir,
      absolute: true,
      ignore: ignorePatterns,
    })

    for (const directivePath of directiveFiles) {
      const alreadyExists = nitro.scanDirectives.some(d => d.specifier === directivePath)
      if (alreadyExists)
        continue

      const parsed = await parseSingleFile(directivePath, parseDirectiveCall)
      if (parsed?.imports.length) {
        nitro.scanDirectives.push(parsed)
        directivesAdded++
      }
    }
  }

  // Scan clientDir for documents (.graphql files)
  if (source.clientDir && existsSync(source.clientDir)) {
    const documentFiles = await glob(GRAPHQL_GLOB_PATTERN, {
      cwd: source.clientDir,
      absolute: true,
      ignore: ignorePatterns,
    })

    for (const docPath of documentFiles) {
      if (!nitro.scanDocuments.includes(docPath)) {
        nitro.scanDocuments.push(docPath)
        documentsAdded++
      }
    }
  }

  return { schemas: schemasAdded, resolvers: resolversAdded, directives: directivesAdded, documents: documentsAdded, hasConfig: false, hasSchema: false }
}
