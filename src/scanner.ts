import { loadFilesSync } from '@graphql-tools/load-files'
import { join } from 'pathe'
import type { Nitro } from 'nitropack/types'
import { consola } from 'consola'

export interface ScanResult {
  typeDefs: string[]
  resolverPaths: string[]
}

export function scanGraphQLFiles(nitro: Nitro): ScanResult {
  const graphqlDir = join(nitro.options.srcDir, 'graphql')
  
  try {
    // Load all .graphql files
    const typeDefs = loadFilesSync(join(graphqlDir, '**/*.graphql'), {
      recursive: true,
      ignoreIndex: true,
    })
    
    // For now, we don't need to scan resolver files
    const resolverPaths: string[] = []
    
    consola.info(`[nitro-graphql-yoga] Found ${typeDefs.length} GraphQL schema files and ${resolverPaths.length} resolver files`)
    
    return {
      typeDefs: typeDefs as string[],
      resolverPaths,
    }
  } catch (error) {
    consola.warn('[nitro-graphql-yoga] Error scanning GraphQL files:', error)
    return {
      typeDefs: [],
      resolverPaths: [],
    }
  }
}