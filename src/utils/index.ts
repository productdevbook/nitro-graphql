import type { Nitro } from 'nitropack'
import type { GenImport } from '../types'
import { readFile } from 'node:fs/promises'
import { hash } from 'ohash'
import { parseSync } from 'oxc-parser'
import { join, relative } from 'pathe'
import { glob } from 'tinyglobby'

export const GLOB_SCAN_PATTERN = '**/*.{graphql,gql,js,mjs,cjs,ts,mts,cts,tsx,jsx}'

// Re-export directive parser utilities
export { directiveParser, generateDirectiveSchema, generateDirectiveSchemas } from './directive-parser'
interface FileInfo { path: string, fullPath: string }

/**
 * Get all Nuxt layer directories from Nitro config
 */
export function getLayerDirectories(nitro: Nitro): string[] {
  // Get layer directories that were passed from Nuxt module
  return nitro.options.graphql?.layerDirectories || []
}

/**
 * Get all Nuxt layer server directories from Nitro config
 */
export function getLayerServerDirectories(nitro: Nitro): string[] {
  // Get layer server directories that were passed from Nuxt module
  return nitro.options.graphql?.layerServerDirs || []
}

/**
 * Get all Nuxt layer app directories from Nitro config
 */
export function getLayerAppDirectories(nitro: Nitro): string[] {
  // Get layer app directories that were passed from Nuxt module
  return nitro.options.graphql?.layerAppDirs || []
}

/**
 * Generate layer-aware ignore patterns for auto-generated files
 */
export function generateLayerIgnorePatterns(nitro: Nitro): string[] {
  const patterns: string[] = []

  // Main project pattern - use relative path from serverDir to _directives.graphql
  patterns.push(`${nitro.graphql.serverDir}/_directives.graphql`)

  // Layer-specific patterns using actual server directories
  const layerServerDirs = nitro.options.graphql?.layerServerDirs || []
  for (const layerServerDir of layerServerDirs) {
    // Add each layer's generated files to ignore list using actual server path
    patterns.push(`${layerServerDir}/graphql/_directives.graphql`)
  }

  return patterns
}

export function getImportId(p: string, lazy?: boolean) {
  return (lazy ? '_lazy_' : '_') + hash(p).replace(/-/g, '').slice(0, 6)
}

const RELATIVE_RE = /^\.{1,2}\//

export function relativeWithDot(from: string, to: string) {
  const rel = relative(from, to)
  return RELATIVE_RE.test(rel) ? rel : `./${rel}`
}

export async function scanGraphql(nitro: Nitro) {
  const files = await scanFiles(nitro, 'graphql')
  return files.map(f => f.fullPath)
}

export async function scanResolvers(nitro: Nitro) {
  const files = await scanFiles(nitro, 'graphql', '**/*.resolver.{ts,js}')

  const exportName: GenImport[] = []
  const VALID_DEFINE_FUNCTIONS = ['defineResolver', 'defineQuery', 'defineMutation', 'defineType', 'defineField', 'defineSubscription', 'defineDirective']

  for (const file of files) {
    try {
      const fileContent = await readFile(file.fullPath, 'utf-8')
      const parsed = parseSync(file.fullPath, fileContent)

      const exports: GenImport = {
        imports: [],
        specifier: file.fullPath,
      }

      let hasDefaultExport = false
      let hasNamedExport = false
      const namedExports: string[] = []

      for (const node of parsed.program.body) {
        // Check for default exports (for warning)
        if (node.type === 'ExportDefaultDeclaration') {
          hasDefaultExport = true
        }

        if (
          node.type === 'ExportNamedDeclaration'
          && node.declaration
          && node.declaration.type === 'VariableDeclaration'
        ) {
          for (const decl of node.declaration.declarations) {
            if (decl.type === 'VariableDeclarator' && decl.init && decl.id.type === 'Identifier') {
              hasNamedExport = true
              namedExports.push(decl.id.name)

              if (decl.init && decl.init.type === 'CallExpression') {
                if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineResolver') {
                  exports.imports.push({
                    name: decl.id.name,
                    type: 'resolver',
                    as: `_${hash(decl.id.name + file.fullPath).replace(/-/g, '').slice(0, 6)}`,
                  })
                }

                if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineQuery') {
                  exports.imports.push({
                    name: decl.id.name,
                    type: 'query',
                    as: `_${hash(decl.id.name + file.fullPath).replace(/-/g, '').slice(0, 6)}`,
                  })
                }

                if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineMutation') {
                  exports.imports.push({
                    name: decl.id.name,
                    type: 'mutation',
                    as: `_${hash(decl.id.name + file.fullPath).replace(/-/g, '').slice(0, 6)}`,
                  })
                }

                if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineType') {
                  exports.imports.push({
                    name: decl.id.name,
                    type: 'type',
                    as: `_${hash(decl.id.name + file.fullPath).replace(/-/g, '').slice(0, 6)}`,
                  })
                }

                if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineField') {
                  exports.imports.push({
                    name: decl.id.name,
                    type: 'type',
                    as: `_${hash(decl.id.name + file.fullPath).replace(/-/g, '').slice(0, 6)}`,
                  })
                }

                if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineSubscription') {
                  exports.imports.push({
                    name: decl.id.name,
                    type: 'subscription',
                    as: `_${hash(decl.id.name + file.fullPath).replace(/-/g, '').slice(0, 6)}`,
                  })
                }

                if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineDirective') {
                  exports.imports.push({
                    name: decl.id.name,
                    type: 'directive',
                    as: `_${hash(decl.id.name + file.fullPath).replace(/-/g, '').slice(0, 6)}`,
                  })
                }
              }
            }
          }
        }
      }

      // Emit warnings for common issues (only in development)
      if (nitro.options.dev) {
        const relPath = relative(nitro.options.rootDir, file.fullPath)

        if (hasDefaultExport && !hasNamedExport) {
          nitro.logger.warn(`[nitro-graphql] ${relPath}: Using default export instead of named export. Resolvers must use named exports like "export const myResolver = defineQuery(...)". Default exports are not detected.`)
        }

        if (exports.imports.length === 0 && hasNamedExport) {
          const validFunctions = VALID_DEFINE_FUNCTIONS.join(', ')
          nitro.logger.warn(`[nitro-graphql] ${relPath}: File has named exports [${namedExports.join(', ')}] but none use the required define functions (${validFunctions}). Exports will not be registered.`)
        }

        if (!hasDefaultExport && !hasNamedExport) {
          nitro.logger.warn(`[nitro-graphql] ${relPath}: No exports found. Resolver files must export resolvers using defineResolver, defineQuery, defineMutation, etc.`)
        }
      }

      if (exports.imports.length > 0) {
        exportName.push(exports)
      }
    }
    catch (error) {
      const relPath = relative(nitro.options.rootDir, file.fullPath)
      nitro.logger.error(`[nitro-graphql] Failed to parse resolver file ${relPath}:`, error)
      // Continue processing other files
    }
  }

  return exportName
}

export async function scanDirectives(nitro: Nitro) {
  const files = await scanFiles(nitro, 'graphql', '**/*.directive.{ts,js}')

  const exportName: GenImport[] = []
  for (const file of files) {
    const fileContent = await readFile(file.fullPath, 'utf-8')
    const parsed = await parseSync(file.fullPath, fileContent)

    const exports: GenImport = {
      imports: [],
      specifier: file.fullPath,
    }
    for (const node of parsed.program.body) {
      if (
        node.type === 'ExportNamedDeclaration'
        && node.declaration
        && node.declaration.type === 'VariableDeclaration'
      ) {
        for (const decl of node.declaration.declarations) {
          if (decl.type === 'VariableDeclarator' && decl.init && decl.id.type === 'Identifier') {
            if (decl.init && decl.init.type === 'CallExpression') {
              if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineDirective') {
                exports.imports.push({
                  name: decl.id.name,
                  type: 'directive',
                  as: `_${hash(decl.id.name + file.fullPath).replace(/-/g, '').slice(0, 6)}`,
                })
              }
            }
          }
        }
      }
    }
    if (exports.imports.length > 0) {
      exportName.push(exports)
    }
  }

  return exportName
}

export async function scanTypeDefs(nitro: Nitro) {
  const files = await scanFiles(nitro, 'graphql', '**/*.typedef.{ts,js}')
  return files.map(f => f.fullPath)
}

export async function scanSchemas(nitro: Nitro) {
  const files = await scanFiles(nitro, 'graphql', '**/*.graphql')
  return files.map(f => f.fullPath)
}

export async function scanDocs(nitro: Nitro) {
  // Scan main project documents
  const files = await scanDir(nitro, nitro.options.rootDir, nitro.graphql.dir.client, '**/*.graphql')

  // Scan layer documents for Nuxt projects
  const layerAppDirs = getLayerAppDirectories(nitro)
  const layerFiles = await Promise.all(
    layerAppDirs.map(layerAppDir => scanDir(nitro, layerAppDir, 'graphql', '**/*.graphql')),
  ).then(r => r.flat())

  // Remove duplicates based on fullPath
  const combinedFiles = [...files, ...layerFiles]
  const seenPaths = new Set<string>()
  const allFiles = combinedFiles.filter((file) => {
    if (seenPaths.has(file.fullPath)) {
      return false
    }
    seenPaths.add(file.fullPath)
    return true
  })

  // Get external service document patterns to filter out
  const externalServices = nitro.options.graphql?.externalServices || []
  const externalPatterns = externalServices.flatMap(service => service.documents || [])

  // Filter out files in the external directory and files matching external service patterns
  return allFiles
    .filter(f => !f.path.startsWith('external/'))
    .filter((f) => {
      // Check if this file matches any external service document patterns
      const relativePath = f.path

      for (const pattern of externalPatterns) {
        // Remove the leading client directory path from patterns to match relative paths
        // This handles both 'app/graphql/' and custom client directory patterns
        const clientDirPattern = `${nitro.graphql.dir.client}/`
        const cleanPattern = pattern.replace(new RegExp(`^${clientDirPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '')

        // Extract directory name from pattern for matching
        const patternDir = cleanPattern.split('/')[0]
        const fileDir = relativePath.split('/')[0]

        // If the file is in a directory that's part of an external service pattern, exclude it
        if (patternDir === fileDir) {
          return false
        }
      }

      return true
    })
    .map(f => f.fullPath)
}

/**
 * Scan documents for a specific external service
 */
export async function scanExternalServiceDocs(nitro: Nitro, serviceName: string, patterns: string[]): Promise<string[]> {
  if (!patterns.length) {
    return []
  }

  const files: string[] = []
  for (const pattern of patterns) {
    try {
      const serviceFiles = await glob(pattern, {
        cwd: nitro.options.rootDir,
        dot: true,
        ignore: nitro.options.ignore,
        absolute: true,
      })
      files.push(...serviceFiles)
    }
    catch (error) {
      nitro.logger.warn(`[graphql:${serviceName}] Error scanning documents with pattern "${pattern}":`, error)
    }
  }

  return files.filter((file, index, self) => self.indexOf(file) === index) // Remove duplicates
}

/**
 * Validate external GraphQL service configuration
 */
export function validateExternalServices(services: unknown[]): string[] {
  const errors: string[] = []
  const serviceNames = new Set<string>()

  for (const [index, service] of services.entries()) {
    const prefix = `externalServices[${index}]`

    // Type guard: ensure service is an object
    if (!service || typeof service !== 'object') {
      errors.push(`${prefix} must be an object`)
      continue
    }

    // Check required fields
    if (!('name' in service) || typeof service.name !== 'string') {
      errors.push(`${prefix}.name is required and must be a string`)
    }
    else if (serviceNames.has(service.name)) {
      errors.push(`${prefix}.name "${service.name}" must be unique`)
    }
    else {
      serviceNames.add(service.name)
    }

    // schema is optional - defaults to endpoint if not specified

    if (!('endpoint' in service) || typeof service.endpoint !== 'string') {
      errors.push(`${prefix}.endpoint is required and must be a string`)
    }
    else {
      // Basic URL validation
      try {
        const url = new URL(service.endpoint)
        // URL is valid if we reach this point
        void url
      }
      catch {
        errors.push(`${prefix}.endpoint "${service.endpoint}" must be a valid URL`)
      }
    }

    // Validate service name format (should be valid for file names and TypeScript)
    if ('name' in service && service.name && typeof service.name === 'string' && !/^[a-z]\w*$/i.test(service.name)) {
      errors.push(`${prefix}.name "${service.name}" must be a valid identifier (letters, numbers, underscore, starting with letter)`)
    }
  }

  return errors
}

async function scanFiles(nitro: Nitro, name: string, globPattern = GLOB_SCAN_PATTERN): Promise<FileInfo[]> {
  // Scan regular directories
  const regularFiles = await Promise.all(
    nitro.options.scanDirs.map(dir => scanDir(nitro, dir, name, globPattern)),
  ).then(r => r.flat())

  // Scan layer directories for Nuxt projects
  const layerDirectories = getLayerDirectories(nitro)
  const layerFiles = await Promise.all(
    layerDirectories.map(layerDir => scanDir(nitro, layerDir, `server/${name}`, globPattern)),
  ).then(r => r.flat())

  // Remove duplicates based on fullPath
  const allFiles = [...regularFiles, ...layerFiles]
  const seenPaths = new Set<string>()
  return allFiles.filter((file) => {
    if (seenPaths.has(file.fullPath)) {
      return false
    }
    seenPaths.add(file.fullPath)
    return true
  })
}

async function scanDir(
  nitro: Nitro,
  dir: string,
  name: string,
  globPattern = GLOB_SCAN_PATTERN,
): Promise<FileInfo[]> {
  const fileNames = await glob(join(name, globPattern), {
    cwd: dir,
    dot: true,
    ignore: nitro.options.ignore,
    absolute: true,
  }).catch((error) => {
    if (error?.code === 'ENOTDIR') {
      nitro.logger.warn(
        `Ignoring \`${join(dir, name)}\`. It must be a directory.`,
      )
      return []
    }
    throw error
  })
  return fileNames
    .map((fullPath) => {
      return {
        fullPath,
        path: relative(join(dir, name), fullPath),
      }
    })
    .sort((a, b) => a.path.localeCompare(b.path))
}
