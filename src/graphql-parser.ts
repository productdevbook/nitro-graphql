import { readFileSync } from 'node:fs'
import { join } from 'pathe'

export interface GraphQLResolverBlock {
  type: 'query' | 'mutation' | 'subscription'
  name: string
  code: string
  imports?: string[]
}

export interface ParsedGraphQLFile {
  typeDefs: string
  resolvers: GraphQLResolverBlock[]
}

export function parseGraphQLFileWithResolvers(filePath: string): ParsedGraphQLFile {
  const content = readFileSync(filePath, 'utf-8')

  const result: ParsedGraphQLFile = {
    typeDefs: '',
    resolvers: [],
  }

  // Split by resolver blocks
  const lines = content.split('\n')
  let currentSection: 'typedefs' | 'resolver' = 'typedefs'
  let currentResolver: GraphQLResolverBlock | null = null
  let typeDefLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for resolver block start
    if (line.match(/^#\s*@resolver\s+(\w+)\.(\w+)/)) {
      // Save previous typedefs
      if (currentSection === 'typedefs' && typeDefLines.length > 0) {
        result.typeDefs += `${typeDefLines.join('\n')}\n`
        typeDefLines = []
      }

      // Save previous resolver
      if (currentResolver) {
        result.resolvers.push(currentResolver)
      }

      const match = line.match(/^#\s*@resolver\s+(\w+)\.(\w+)/)
      if (match) {
        const [, type, name] = match
        currentResolver = {
          type: type.toLowerCase() as 'query' | 'mutation' | 'subscription',
          name,
          code: '',
          imports: [],
        }
        currentSection = 'resolver'
      }
      continue
    }

    // Check for resolver block end
    if (line.match(/^#\s*@end/)) {
      if (currentResolver) {
        result.resolvers.push(currentResolver)
        currentResolver = null
      }
      currentSection = 'typedefs'
      continue
    }

    // Check for imports in resolver block
    if (currentSection === 'resolver' && line.match(/^#\s*@import\s+(.+)/)) {
      const match = line.match(/^#\s*@import\s+(.+)/)
      if (match && currentResolver) {
        currentResolver.imports = currentResolver.imports || []
        currentResolver.imports.push(match[1])
      }
      continue
    }

    // Add line to current section
    if (currentSection === 'typedefs') {
      typeDefLines.push(line)
    }
    else if (currentSection === 'resolver' && currentResolver) {
      // Skip comment lines in resolver blocks
      if (!line.startsWith('#')) {
        currentResolver.code += `${line}\n`
      }
    }
  }

  // Add remaining typedefs
  if (typeDefLines.length > 0) {
    result.typeDefs += typeDefLines.join('\n')
  }

  // Add remaining resolver
  if (currentResolver) {
    result.resolvers.push(currentResolver)
  }

  return result
}

export function generateResolverFromGraphQLBlock(block: GraphQLResolverBlock): string {
  // GraphQL dosyalarından çıkan resolver'ları şimdilik devre dışı bırakalım
  // çünkü runtime'da import problemi yaşıyoruz
  return `
// GraphQL resolver for ${block.type}.${block.name} - disabled due to import issues
null
`
}

export function extractResolversFromGraphQLFiles(files: string[]): { [key: string]: string } {
  const resolvers: { [key: string]: string } = {}

  for (const filePath of files) {
    try {
      const parsed = parseGraphQLFileWithResolvers(filePath)

      for (const resolver of parsed.resolvers) {
        const key = `${resolver.type}_${resolver.name}`
        resolvers[key] = generateResolverFromGraphQLBlock(resolver)
      }
    }
    catch (error) {
      console.warn(`Failed to parse GraphQL file ${filePath}:`, error)
    }
  }

  return resolvers
}
