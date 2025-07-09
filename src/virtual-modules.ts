import type { Nitro } from 'nitropack/types'
import type { GraphQLFileInfo, ResolverInfo } from './scanner'
import { extractResolversFromGraphQLFiles } from './graphql-parser'

export function generateResolverModule(nitro: Nitro, resolvers: ResolverInfo[], graphqlFiles: GraphQLFileInfo[] = []): string {
  // Import all resolver files
  const dynamicImports = resolvers.map((resolver) => {
    const importName = `resolver_${resolver.name.replace(/[^a-z0-9]/gi, 'resolvers')}`
    return `const ${importName} = await import('${resolver.path}').then(m => m.default || m).catch(err => {
    console.warn('[nitro-graphql-yoga] Failed to import resolver:', '${resolver.path}', err.message)
    return null
  })`
  }).join('\n  ')

  // For now, skip GraphQL file resolvers due to import issues
  // const graphqlResolvers = extractResolversFromGraphQLFiles(
  //   graphqlFiles.filter(f => f.hasResolvers).map(f => f.path)
  // )

  // Merge all resolvers
  const allResolverImports = resolvers.map(r => `resolver_${r.name.replace(/[^a-z0-9]/gi, 'resolvers')}`)

  return `// Auto-generated resolver module
import { mergeResolvers } from '@graphql-tools/merge'

async function createResolvers() {
  ${dynamicImports}
  
  const allResolvers = [
    ${allResolverImports.join(',\n    ')}
  ].filter(Boolean)
  
  if (allResolvers.length === 0) {
    console.warn('[nitro-graphql-yoga] No resolvers found, returning empty object')
    return {}
  }
  
  return mergeResolvers(allResolvers)
}

export const resolvers = await createResolvers()
export default resolvers
`
}

export function generateResolverImportModule(nitro: Nitro, resolvers: ResolverInfo[]): string {
  const resolversByType = resolvers.reduce((acc, resolver) => {
    if (!acc[resolver.type])
      acc[resolver.type] = []
    acc[resolver.type].push(resolver)
    return acc
  }, {} as Record<string, ResolverInfo[]>)

  const imports = Object.entries(resolversByType).map(([type, resolverList]) => {
    const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1)
    const resolverImports = resolverList.map((resolver) => {
      const safeName = resolver.name.replace(/[^a-z0-9]/gi, 'resolvers')
      return `  ${safeName}: () => import('${resolver.path}').then(m => m.default || m)`
    }).join(',\n')

    return `const ${type}Resolvers = {\n${resolverImports}\n}`
  }).join('\n\n')

  const exportObject = Object.keys(resolversByType).map((type) => {
    const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1)
    return `  ${typeCapitalized}: ${type}Resolvers`
  }).join(',\n')

  return `// Auto-generated resolver import module
${imports}

export const resolverImports = {
${exportObject}
}

export default resolverImports
`
}

export function generateResolverRegistryModule(nitro: Nitro, resolvers: ResolverInfo[]): string {
  const resolverMap = resolvers.map((resolver) => {
    return `  {
    name: '${resolver.name}',
    type: '${resolver.type}',
    path: '${resolver.path}',
    importPath: '${resolver.importPath}',
    relativePath: '${resolver.relativePath}',
  }`
  }).join(',\n')

  return `// Auto-generated resolver registry
export const resolverRegistry = [
${resolverMap}
]

export type ResolverRegistryItem = {
  name: string
  type: 'query' | 'mutation' | 'subscription'
  path: string
  importPath: string
  relativePath: string
}

export default resolverRegistry
`
}
