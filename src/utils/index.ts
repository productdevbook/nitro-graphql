import type { Nitro } from 'nitropack'
import type { GenImport } from '../types'
import { readFile } from 'node:fs/promises'
import { hash } from 'ohash'
import { parseAsync } from 'oxc-parser'
import { join, relative } from 'pathe'
import { glob } from 'tinyglobby'

export const GLOB_SCAN_PATTERN = '**/*.{graphql,gql,js,mjs,cjs,ts,mts,cts,tsx,jsx}'
interface FileInfo { path: string, fullPath: string }

export function getImportId(p: string, lazy?: boolean) {
  return (lazy ? '_lazy_' : '_') + hash(p).replace(/-/g, '').slice(0, 6)
}

const RELATIVE_RE = /^\.{1,2}\//

export function relativeWithDot(from: string, to: string) {
  const rel = relative(from, to)
  return RELATIVE_RE.test(rel) ? rel : `./${rel}`
}

// export async function scanClient(nitro: Nitro) {
//   if (nitro.options.framework.name === 'nuxt') {
//     const graphql = join(nitro.options.rootDir, 'app')
//     const files = await scanDir(nitro, graphql, 'graphql', '**/*.graphql')
//     return files.map(f => f.fullPath)
//   }

//   return []
// }

export async function scanGraphql(nitro: Nitro) {
  const files = await scanFiles(nitro, 'graphql')
  return files.map(f => f.fullPath)
}

export async function scanResolvers(nitro: Nitro) {
  const files = await scanFiles(nitro, 'graphql', '**/*.resolver.{ts,js}')

  const exportName: GenImport[] = []
  for (const file of files) {
    const fileContent = await readFile(file.fullPath, 'utf-8')
    const parsed = await parseAsync(file.fullPath, fileContent)

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
        // TODO: if there is no cost, there is a mistake
        for (const decl of node.declaration.declarations) {
          if (decl.type === 'VariableDeclarator' && decl.init && decl.id.type === 'Identifier') {
            if (decl.init && decl.init.type === 'CallExpression') {
              if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineResolver') {
                exports.imports.push({
                  name: decl.id.name,
                  type: 'resolver',
                  as: `_${hash(decl.id.name + file.path).replace(/-/g, '').slice(0, 6)}`,
                })
              }

              if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineQuery') {
                exports.imports.push({
                  name: decl.id.name,
                  type: 'query',
                  as: `_${hash(decl.id.name + file.path).replace(/-/g, '').slice(0, 6)}`,
                })
              }

              if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineMutation') {
                exports.imports.push({
                  name: decl.id.name,
                  type: 'mutation',
                  as: `_${hash(decl.id.name + file.path).replace(/-/g, '').slice(0, 6)}`,
                })
              }

              if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineType') {
                exports.imports.push({
                  name: decl.id.name,
                  type: 'type',
                  as: `_${hash(decl.id.name + file.path).replace(/-/g, '').slice(0, 6)}`,
                })
              }

              if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineSubscription') {
                exports.imports.push({
                  name: decl.id.name,
                  type: 'subscription',
                  as: `_${hash(decl.id.name + file.path).replace(/-/g, '').slice(0, 6)}`,
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

export async function scanDirectives(nitro: Nitro) {
  const files = await scanFiles(nitro, 'graphql', '**/*.directive.{ts,js}')
  return files.map(f => f.fullPath)
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
  const files = await scanDir(nitro, nitro.options.rootDir, nitro.graphql.dir.client, '**/*.graphql')
  return files.map(f => f.fullPath)
}

async function scanFiles(nitro: Nitro, name: string, globPattern = GLOB_SCAN_PATTERN): Promise<FileInfo[]> {
  const files = await Promise.all(
    nitro.options.scanDirs.map(dir => scanDir(nitro, dir, name, globPattern)),
  ).then(r => r.flat())
  return files
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
