import type { YogaServerOptions } from 'graphql-yoga'
import type { GraphQLSchemaConfig, Resolvers } from 'nitro-graphql'
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

// TODO: check used.
export function defineGraphQLSchema(config: GraphQLSchemaConfig): GraphQLSchemaConfig {
  return config
}

export function defineResolver(
  resolvers: Resolvers,
): Resolvers {
  return resolvers
}

/**
 * Helper function to define GraphQL Yoga configuration with type safety
 */
export function defineYogaConfig<TServerContext = any, TUserContext = any>(
  config: Partial<YogaServerOptions<TServerContext, TUserContext>>,
): Partial<YogaServerOptions<TServerContext, TUserContext>> {
  return config
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

    for (const node of parsed.program.body) {
      if (
        node.type === 'ExportNamedDeclaration'
        && node.declaration
        && node.declaration.type === 'VariableDeclaration'
      ) {
        for (const decl of node.declaration.declarations) {
          if (decl.type === 'VariableDeclarator' && decl.init && decl.id.type === 'Identifier') {
            if (decl.init && decl.init.type === 'CallExpression') {
              if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineResolver') {
                exportName.push({
                  specifier: file.fullPath,
                  imports: [{
                    name: decl.id.name,
                    type: 'resolver',
                    as: `_${hash(decl.id.name + file.path).replace(/-/g, '').slice(0, 10)}`,
                  }],
                })
              }

              if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineQuery') {
                console.log('Found schema:', decl.id.name)
              }

              if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineMutation') {
                console.log('Found mutation:', decl.id.name)
              }

              if (decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'defineType') {
                console.log('Found type:', decl.id.name)
              }
            }
          }
        }
      }
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

export async function scanDefs(nitro: Nitro) {
  const files = await scanFiles(nitro, 'graphql', '**/*.graphql')
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

export function unique(arr: any[]) {
  return [...new Set(arr)]
}
