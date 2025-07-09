import type { Nitro } from 'nitropack/types'
import type { ResolverInfo } from './scanner'
import { basename, dirname, join, relative } from 'pathe'

export interface ResolverMapping {
  resolverName: string
  fieldName: string
  filePath: string
  importPath: string
  isGraphQLFile: boolean
  metadata: {
    directory: string
    filename: string
    relativePath: string
  }
}

export function createResolverMapping(nitro: Nitro, resolvers: ResolverInfo[]): ResolverMapping[] {
  const mappings: ResolverMapping[] = []
  
  for (const resolver of resolvers) {
    // Extract field name from file path
    const fieldName = extractFieldName(resolver)
    
    // Create mapping entry
    mappings.push({
      resolverName: resolver.name,
      fieldName,
      filePath: resolver.path,
      importPath: resolver.importPath,
      isGraphQLFile: resolver.isGraphQLFile || false,
      metadata: {
        directory: dirname(resolver.relativePath),
        filename: basename(resolver.path),
        relativePath: resolver.relativePath,
      }
    })
  }
  
  return mappings
}

function extractFieldName(resolver: ResolverInfo): string {
  // Use the filename as the field name - simple and flexible
  const filename = basename(resolver.path, '.ts') || basename(resolver.path, '.js') || basename(resolver.path, '.mjs')
  return filename
}

export function generateResolverMappingModule(nitro: Nitro, mappings: ResolverMapping[]): string {
  const mappingEntries = mappings.map(mapping => {
    return `  {
    resolverName: '${mapping.resolverName}',
    fieldName: '${mapping.fieldName}',
    filePath: '${mapping.filePath}',
    importPath: '${mapping.importPath}',
    isGraphQLFile: ${mapping.isGraphQLFile},
    metadata: {
      directory: '${mapping.metadata.directory}',
      filename: '${mapping.metadata.filename}',
      relativePath: '${mapping.metadata.relativePath}',
    }
  }`
  }).join(',\n')

  return `// Auto-generated resolver mapping
export const resolverMappings = [
${mappingEntries}
]

export type ResolverMapping = {
  resolverName: string
  fieldName: string
  filePath: string
  importPath: string
  isGraphQLFile: boolean
  metadata: {
    directory: string
    filename: string
    relativePath: string
  }
}

export function findResolverByName(resolverName: string) {
  return resolverMappings.find(mapping => mapping.resolverName === resolverName)
}

export function getResolversByDirectory(directory: string) {
  return resolverMappings.filter(mapping => mapping.metadata.directory === directory)
}

export default resolverMappings
`
}

export function createRouteStyleMapping(nitro: Nitro, resolvers: ResolverInfo[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  
  for (const resolver of resolvers) {
    // Create a route-style key similar to Nitro API routes
    // e.g., /queries/user/profile.ts -> Query.userProfile
    // e.g., /mutations/user/create.ts -> Mutation.createUser
    
    const typePrefix = resolver.type.charAt(0).toUpperCase() + resolver.type.slice(1)
    const fieldName = extractFieldName(resolver)
    const routeKey = `${typePrefix}.${fieldName}`
    
    mapping[routeKey] = resolver.path
  }
  
  return mapping
}