/**
 * Resolver scanning utilities
 * Scans for resolver files (.resolver.ts/.js) and parses exports
 */

import type { Nitro } from 'nitro/types'
import type { GenImport } from '../../types'
import { readFile } from 'node:fs/promises'
import { hash } from 'ohash'
import { parseSync } from 'oxc-parser'
import { basename, relative } from 'pathe'
import { DEFINE_FUNCTIONS } from '../../constants'
import { getLayerServerDirectories } from '../layers'
import { deduplicateFiles, scanDir } from './common'

/**
 * Scan for resolver files and parse their exports
 */
export async function scanResolvers(nitro: Nitro): Promise<GenImport[]> {
  // Scan from serverDir
  const serverDirRelative = relative(nitro.options.rootDir, nitro.graphql.serverDir)
  const regularFiles = await scanDir(nitro, nitro.options.rootDir, serverDirRelative, '**/*.resolver.{ts,js}')

  // Also scan layer directories for Nuxt projects
  const layerServerDirs = getLayerServerDirectories(nitro)
  const layerFiles = await Promise.all(
    layerServerDirs.map(layerServerDir =>
      scanDir(nitro, layerServerDir, 'graphql', '**/*.resolver.{ts,js}'),
    ),
  ).then(r => r.flat())

  // Combine and deduplicate
  const files = deduplicateFiles([...regularFiles, ...layerFiles])

  const exportName: GenImport[] = []

  for (const file of files) {
    try {
      const fileContent = await readFile(file.fullPath, 'utf-8')
      const parsed = parseSync(file.fullPath, fileContent)

      // Check for syntax errors first
      if (parsed.errors && parsed.errors.length > 0) {
        if (nitro.options.dev) {
          const fileName = basename(file.fullPath)
          const firstError = parsed.errors[0]
          // Extract line number if available
          const location = firstError?.labels?.[0]
          const lineInfo = location ? `:${location.start}` : ''
          // Simplify error message
          const message = firstError?.message.split(',')[0] || 'Syntax error' // Take first part before comma
          console.error(`✖ ${fileName}${lineInfo} - ${message}`)
        }
        continue
      }

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
          const validFunctions = DEFINE_FUNCTIONS.join(', ')
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
