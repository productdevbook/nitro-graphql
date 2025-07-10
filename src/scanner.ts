import type { Nitro } from 'nitropack/types'
import { existsSync, readFileSync } from 'node:fs'
import { consola } from 'consola'
import { globby } from 'globby'
import { basename, join, relative } from 'pathe'

export interface ResolverInfo {
  path: string
  relativePath: string
  name: string
  importPath: string
  isGraphQLFile?: boolean
}

export interface GraphQLFileInfo {
  path: string
  relativePath: string
  content: string
  hasResolvers: boolean
  typeDefs?: string
  resolvers?: any
}

export interface ScanResult {
  typeDefs: string[]
  resolverPaths: string[]
  resolvers: ResolverInfo[]
  graphqlFiles: GraphQLFileInfo[]
  yogaConfigPath?: string
}

export async function scanGraphQLFiles(nitro: Nitro): Promise<ScanResult> {
  try {
    // Scan GraphQL files with enhanced parsing
    const graphqlFiles = await scanGraphQLFilesWithResolvers(nitro)
    const typeDefs = graphqlFiles.map(f => f.typeDefs).filter(Boolean) as string[]

    // Scan separate resolver files
    const resolvers = await scanResolverFiles(nitro)
    const resolverPaths = resolvers.map(r => r.path)

    // Scan for GraphQL Yoga config file
    const yogaConfigPath = await scanForYogaConfig(nitro)

    consola.info(`[graphql] Found ${typeDefs.length} schema files and ${resolvers.length} resolvers`)

    return {
      typeDefs,
      resolverPaths,
      resolvers,
      graphqlFiles,
      yogaConfigPath,
    }
  }
  catch (error) {
    consola.warn('[graphql] Error scanning files:', error)
    return {
      typeDefs: [],
      resolverPaths: [],
      resolvers: [],
      graphqlFiles: [],
    }
  }
}

export async function scanResolverFiles(nitro: Nitro): Promise<ResolverInfo[]> {
  // Use Nitro's scan pattern (same as API routes)
  const NITRO_GLOB_PATTERN = '**/*.{js,mjs,cjs,ts,mts,cts,tsx,jsx}'

  // Scan all configured scan directories (like Nitro does)
  const resolverFiles = await Promise.all(
    nitro.options.scanDirs.map(async (scanDir) => {
      const graphqlDir = join(scanDir, 'graphql')
      if (!existsSync(graphqlDir))
        return []

      return globby([
        join(graphqlDir, NITRO_GLOB_PATTERN),
        `!${join(graphqlDir, '**/*.d.ts')}`,
        `!${join(graphqlDir, '**/*.test.*')}`,
        `!${join(graphqlDir, '**/*.spec.*')}`,
        `!${join(graphqlDir, '**/yoga.config.ts')}`,
      ], {
        cwd: scanDir,
        dot: true,
        ignore: nitro.options.ignore || [],
        absolute: true,
      })
    }),
  ).then(results => results.flat())

  const resolvers: ResolverInfo[] = []

  for (const filePath of resolverFiles) {
    // Find which scan directory this file belongs to
    const scanDir = nitro.options.scanDirs.find(dir => filePath.startsWith(dir))
    if (!scanDir)
      continue

    const graphqlDir = join(scanDir, 'graphql')
    const relativePath = relative(graphqlDir, filePath)
    const fileName = basename(relativePath, '.ts') || basename(relativePath, '.js') || basename(relativePath, '.mjs')

    // Create import path relative to the graphql directory
    const importPath = relativePath.replace(/\.(ts|js|mjs|tsx|jsx|cjs|mts|cts)$/, '')

    resolvers.push({
      path: filePath,
      relativePath,
      name: fileName,
      importPath,
      isGraphQLFile: false,
    })
  }

  return resolvers
}

export async function scanGraphQLFilesWithResolvers(nitro: Nitro): Promise<GraphQLFileInfo[]> {
  // Scan all configured scan directories (like Nitro does)
  const graphqlFiles = await Promise.all(
    nitro.options.scanDirs.map(async (scanDir) => {
      const graphqlDir = join(scanDir, 'graphql')
      if (!existsSync(graphqlDir))
        return []

      return globby([
        join(graphqlDir, '**/*.graphql'),
        join(graphqlDir, '**/*.gql'),
      ], {
        cwd: scanDir,
        dot: true,
        ignore: nitro.options.ignore || [],
        absolute: true,
      })
    }),
  ).then(results => results.flat())

  const files: GraphQLFileInfo[] = []

  for (const filePath of graphqlFiles) {
    // Find which scan directory this file belongs to
    const scanDir = nitro.options.scanDirs.find(dir => filePath.startsWith(dir))
    if (!scanDir)
      continue

    const graphqlDir = join(scanDir, 'graphql')
    const relativePath = relative(graphqlDir, filePath)
    const contentStr = readFileSync(filePath, 'utf-8')

    // Check if file contains resolver definitions
    const hasResolvers = contentStr.includes('# @resolver') || contentStr.includes('# @resolvers')

    // Extract only the schema part (before resolver definitions)
    let typeDefs = contentStr
    if (hasResolvers) {
      const lines = contentStr.split('\n')
      const schemaLines = []

      for (const line of lines) {
        if (line.match(/^#\s*@resolver/)) {
          break
        }
        schemaLines.push(line)
      }

      typeDefs = schemaLines.join('\n').trim()
    }

    files.push({
      path: filePath,
      relativePath,
      content: contentStr,
      hasResolvers,
      typeDefs,
    })
  }

  return files
}

export async function scanForYogaConfig(nitro: Nitro): Promise<string | undefined> {
  // Only support yoga.config.ts for simplicity
  const configFileName = 'yoga.config.ts'

  // Only check in server/graphql directory
  for (const scanDir of nitro.options.scanDirs) {
    const graphqlDir = join(scanDir, 'graphql')
    const configPath = join(graphqlDir, configFileName)

    if (existsSync(configPath)) {
      return configPath
    }
  }

  return undefined
}
