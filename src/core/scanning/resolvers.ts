/**
 * Resolver scanning utilities
 * Framework-agnostic resolver file scanning and parsing
 */

import type { ResolverImport, ScanContext, ScannedResolver, ScanResult } from '../types/scanning'
import { readFile } from 'node:fs/promises'
import { hash } from 'ohash'
import { parseSync } from 'oxc-parser'
import { basename, relative } from 'pathe'
import { DEFINE_FUNCTIONS, RESOLVER_GLOB_PATTERN } from '../constants'
import { deduplicateFiles, scanDirectory } from './common'

/**
 * Scan for resolver files and parse their exports
 */
export async function scanResolversCore(ctx: ScanContext): Promise<ScanResult<ScannedResolver>> {
  const warnings: string[] = []
  const errors: string[] = []

  try {
    // Scan from serverDir
    const serverDirRelative = relative(ctx.rootDir, ctx.serverDir)
    const regularFiles = await scanDirectory(ctx, ctx.rootDir, serverDirRelative, RESOLVER_GLOB_PATTERN)

    // Also scan layer directories
    const layerFiles = await Promise.all(
      (ctx.layerServerDirs || []).map(layerServerDir =>
        scanDirectory(ctx, layerServerDir, 'graphql', RESOLVER_GLOB_PATTERN),
      ),
    ).then(r => r.flat())

    // Combine and deduplicate
    const files = deduplicateFiles([...regularFiles, ...layerFiles])

    const resolvers: ScannedResolver[] = []

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

        const result = parseResolverExports(file.fullPath, parsed.program)

        // Emit warnings for common issues
        if (ctx.isDev && result.warnings.length > 0) {
          const relPath = relative(ctx.rootDir, file.fullPath)
          for (const warning of result.warnings) {
            warnings.push(`${relPath}: ${warning}`)
          }
        }

        if (result.resolver.imports.length > 0) {
          resolvers.push(result.resolver)
        }
      }
      catch (error) {
        const relPath = relative(ctx.rootDir, file.fullPath)
        errors.push(`Failed to parse resolver file ${relPath}: ${error}`)
      }
    }

    return { items: resolvers, warnings, errors }
  }
  catch (error) {
    errors.push(`Resolver scanning error: ${error}`)
    return { items: [], warnings, errors }
  }
}

/**
 * Parse resolver exports from AST
 */
function parseResolverExports(
  filePath: string,
  program: { body: any[] },
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
            const imp = parseDefineCall(decl.id.name, decl.init, filePath)
            if (imp) {
              resolver.imports.push(imp)
            }
          }
        }
      }
    }
  }

  // Generate warnings for common issues
  if (hasDefaultExport && !hasNamedExport) {
    warnings.push('Using default export instead of named export. Resolvers must use named exports like "export const myResolver = defineQuery(...)". Default exports are not detected.')
  }

  if (resolver.imports.length === 0 && hasNamedExport) {
    const validFunctions = DEFINE_FUNCTIONS.join(', ')
    warnings.push(`File has named exports [${namedExports.join(', ')}] but none use the required define functions (${validFunctions}). Exports will not be registered.`)
  }

  if (!hasDefaultExport && !hasNamedExport) {
    warnings.push('No exports found. Resolver files must export resolvers using defineResolver, defineQuery, defineMutation, etc.')
  }

  return { resolver, warnings }
}

/**
 * Parse a define* function call and return the import info
 */
function parseDefineCall(
  name: string,
  callExpr: { callee: { type: string, name?: string } },
  filePath: string,
): ResolverImport | null {
  if (callExpr.callee.type !== 'Identifier') {
    return null
  }

  const calleeName = callExpr.callee.name
  const aliasHash = `_${hash(name + filePath).replace(/-/g, '').slice(0, 6)}`

  switch (calleeName) {
    case 'defineResolver':
      return { name, type: 'resolver', as: aliasHash }
    case 'defineQuery':
      return { name, type: 'query', as: aliasHash }
    case 'defineMutation':
      return { name, type: 'mutation', as: aliasHash }
    case 'defineField':
      return { name, type: 'type', as: aliasHash }
    case 'defineSubscription':
      return { name, type: 'subscription', as: aliasHash }
    case 'defineDirective':
      return { name, type: 'directive', as: aliasHash }
    default:
      return null
  }
}
