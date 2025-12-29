/**
 * Directive scanning utilities
 * Framework-agnostic directive file scanning and parsing
 */

import type { ScanContext, ScannedDirective, ScannedResolver, ScanResult } from '../types/scanning'
import { readFile } from 'node:fs/promises'
import { hash } from 'ohash'
import { parseSync } from 'oxc-parser'
import { relative } from 'pathe'
import { DIRECTIVE_GLOB_PATTERN } from '../constants'
import { deduplicateFiles, scanDirectory } from './common'

/**
 * Scan for directive files (.directive.ts/.js)
 */
export async function scanDirectivesCore(ctx: ScanContext): Promise<ScanResult<ScannedResolver>> {
  const warnings: string[] = []
  const errors: string[] = []

  try {
    // Scan from serverDir
    const serverDirRelative = relative(ctx.rootDir, ctx.serverDir)
    const regularFiles = await scanDirectory(ctx, ctx.rootDir, serverDirRelative, DIRECTIVE_GLOB_PATTERN)

    // Also scan layer directories
    const layerFiles = await Promise.all(
      (ctx.layerServerDirs || []).map(layerServerDir =>
        scanDirectory(ctx, layerServerDir, 'graphql', DIRECTIVE_GLOB_PATTERN),
      ),
    ).then(r => r.flat())

    // Combine and deduplicate
    const files = deduplicateFiles([...regularFiles, ...layerFiles])

    const directives: ScannedResolver[] = []

    for (const file of files) {
      try {
        const fileContent = await readFile(file.fullPath, 'utf-8')
        const parsed = parseSync(file.fullPath, fileContent)

        const directive: ScannedResolver = {
          specifier: file.fullPath,
          imports: [],
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
                    directive.imports.push({
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

        if (directive.imports.length > 0) {
          directives.push(directive)
        }
      }
      catch (error) {
        const relPath = relative(ctx.rootDir, file.fullPath)
        errors.push(`Failed to parse directive file ${relPath}: ${error}`)
      }
    }

    return { items: directives, warnings, errors }
  }
  catch (error) {
    errors.push(`Directive scanning error: ${error}`)
    return { items: [], warnings, errors }
  }
}

/**
 * Get directive file paths for schema generation
 * Returns files with fullPath for the directive parser
 */
export async function scanDirectiveFilesCore(ctx: ScanContext): Promise<ScanResult<ScannedDirective>> {
  const warnings: string[] = []
  const errors: string[] = []

  try {
    // Scan from serverDir
    const serverDirRelative = relative(ctx.rootDir, ctx.serverDir)
    const regularFiles = await scanDirectory(ctx, ctx.rootDir, serverDirRelative, DIRECTIVE_GLOB_PATTERN)

    // Also scan layer directories
    const layerFiles = await Promise.all(
      (ctx.layerServerDirs || []).map(layerServerDir =>
        scanDirectory(ctx, layerServerDir, 'graphql', DIRECTIVE_GLOB_PATTERN),
      ),
    ).then(r => r.flat())

    // Combine and deduplicate
    const files = deduplicateFiles([...regularFiles, ...layerFiles])

    const directives: ScannedDirective[] = files.map(f => ({
      fullPath: f.fullPath,
      path: f.path,
    }))

    return { items: directives, warnings, errors }
  }
  catch (error) {
    errors.push(`Directive file scanning error: ${error}`)
    return { items: [], warnings, errors }
  }
}
