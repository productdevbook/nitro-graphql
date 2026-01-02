/**
 * Generic AST-based file scanner
 * Extracts common scanning logic from resolvers.ts and directives.ts
 */

import type { ResolverImport, ScanContext, ScannedResolver, ScanResult } from '../types/scanning'
import { readFile } from 'node:fs/promises'
import { parseSync } from 'oxc-parser'
import { basename, relative } from 'pathe'
import { scanWithLayers } from './common'

/**
 * Configuration for AST-based scanning
 */
export interface ASTScanConfig {
  /** Glob pattern for files to scan */
  pattern: string
  /** Parse a function call and return import info, or null if not a valid export */
  parseCall: (calleeName: string, exportName: string, filePath: string) => ResolverImport | null
  /** Whether to emit warnings for common issues (default: true for resolvers) */
  emitWarnings?: boolean
  /** Valid function names for warning messages */
  validFunctions?: readonly string[]
}

/**
 * Scan files matching a pattern and parse their exports using AST
 */
export async function scanWithAST(
  ctx: ScanContext,
  config: ASTScanConfig,
): Promise<ScanResult<ScannedResolver>> {
  const warnings: string[] = []
  const errors: string[] = []

  try {
    // Scan from serverDir with layer support
    const serverDirRelative = relative(ctx.rootDir, ctx.serverDir)
    const files = await scanWithLayers(ctx, {
      mainDir: ctx.rootDir,
      mainSubDir: serverDirRelative,
      layerDirs: ctx.layerServerDirs,
      layerSubDir: 'graphql',
      pattern: config.pattern,
    })

    const results: ScannedResolver[] = []

    for (const file of files) {
      try {
        const fileContent = await readFile(file.fullPath, 'utf-8')
        const parsed = parseSync(file.fullPath, fileContent)

        // Check for syntax errors first
        if (parsed.errors && parsed.errors.length > 0) {
          if (ctx.isDev) {
            const fileName = basename(file.fullPath)
            const firstError = parsed.errors[0]
            const location = firstError?.labels?.[0]
            const lineInfo = location ? `:${location.start}` : ''
            const message = firstError?.message.split(',')[0] || 'Syntax error'
            errors.push(`${fileName}${lineInfo} - ${message}`)
          }
          continue
        }

        const result = parseExports(file.fullPath, parsed.program, config)

        // Emit warnings for common issues (only in dev mode)
        if (ctx.isDev && config.emitWarnings && result.warnings.length > 0) {
          const relPath = relative(ctx.rootDir, file.fullPath)
          for (const warning of result.warnings) {
            warnings.push(`${relPath}: ${warning}`)
          }
        }

        if (result.resolver.imports.length > 0) {
          results.push(result.resolver)
        }
      }
      catch (error) {
        const relPath = relative(ctx.rootDir, file.fullPath)
        errors.push(`Failed to parse file ${relPath}: ${error}`)
      }
    }

    return { items: results, warnings, errors }
  }
  catch (error) {
    errors.push(`Scanning error: ${error}`)
    return { items: [], warnings, errors }
  }
}

/**
 * Parse a single file and extract exports using AST
 * Used for manifest resolver files
 */
export async function parseSingleFile(
  filePath: string,
  parseCall: (calleeName: string, exportName: string, filePath: string) => ResolverImport | null,
): Promise<ScannedResolver | null> {
  try {
    const fileContent = await readFile(filePath, 'utf-8')
    const parsed = parseSync(filePath, fileContent)

    if (parsed.errors && parsed.errors.length > 0) {
      return null
    }

    const result = parseExports(filePath, parsed.program, {
      pattern: '',
      parseCall,
      emitWarnings: false,
    })

    if (result.resolver.imports.length > 0) {
      return result.resolver
    }
    return null
  }
  catch {
    return null
  }
}

/**
 * Parse exports from AST program
 */
function parseExports(
  filePath: string,
  program: { body: any[] },
  config: ASTScanConfig,
): { resolver: ScannedResolver, warnings: string[] } {
  const warnings: string[] = []
  const resolver: ScannedResolver = {
    specifier: filePath,
    imports: [],
  }

  let hasDefaultExport = false
  let hasNamedExport = false
  const namedExports: string[] = []

  for (const node of program.body) {
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
            if (decl.init.callee.type === 'Identifier') {
              const imp = config.parseCall(decl.init.callee.name, decl.id.name, filePath)
              if (imp) {
                resolver.imports.push(imp)
              }
            }
          }
        }
      }
    }
  }

  // Generate warnings for common issues (only if emitWarnings is true)
  if (config.emitWarnings) {
    if (hasDefaultExport && !hasNamedExport) {
      warnings.push('Using default export instead of named export. Must use named exports like "export const myResolver = defineQuery(...)". Default exports are not detected.')
    }

    if (resolver.imports.length === 0 && hasNamedExport) {
      const validFunctions = config.validFunctions?.join(', ') || 'define* functions'
      warnings.push(`File has named exports [${namedExports.join(', ')}] but none use the required define functions (${validFunctions}). Exports will not be registered.`)
    }

    if (!hasDefaultExport && !hasNamedExport) {
      warnings.push('No exports found. Files must export using define* functions.')
    }
  }

  return { resolver, warnings }
}
