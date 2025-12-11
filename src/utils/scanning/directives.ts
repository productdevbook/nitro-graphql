/**
 * Directive scanning utilities
 * Scans for directive files (.directive.ts/.js) and parses exports
 */

import type { Nitro } from 'nitro/types'
import type { GenImport } from '../../types'
import { readFile } from 'node:fs/promises'
import { hash } from 'ohash'
import { parseSync } from 'oxc-parser'
import { relative } from 'pathe'
import { getLayerServerDirectories } from '../layers'
import { deduplicateFiles, scanDir } from './common'

/**
 * Scan for directive files and parse their exports
 */
export async function scanDirectives(nitro: Nitro): Promise<GenImport[]> {
  // Scan from serverDir
  const serverDirRelative = relative(nitro.options.rootDir, nitro.graphql.serverDir)
  const regularFiles = await scanDir(nitro, nitro.options.rootDir, serverDirRelative, '**/*.directive.{ts,js}')

  // Also scan layer directories for Nuxt projects
  const layerServerDirs = getLayerServerDirectories(nitro)
  const layerFiles = await Promise.all(
    layerServerDirs.map(layerServerDir =>
      scanDir(nitro, layerServerDir, 'graphql', '**/*.directive.{ts,js}'),
    ),
  ).then(r => r.flat())

  // Combine and deduplicate
  const files = deduplicateFiles([...regularFiles, ...layerFiles])

  const exportName: GenImport[] = []

  for (const file of files) {
    const fileContent = await readFile(file.fullPath, 'utf-8')
    const parsed = parseSync(file.fullPath, fileContent)

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
