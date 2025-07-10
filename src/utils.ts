import type { GraphQLSchemaConfig, Resolvers } from './types'

export function defineGraphQLSchema(config: GraphQLSchemaConfig): GraphQLSchemaConfig {
  return config
}

export function defineGraphQLResolver(
  resolvers: Resolvers,
): Resolvers {
  return resolvers
}

export function createResolver(
  resolvers: Resolvers,
): Resolvers {
  return resolvers
}

/**
 * Define GraphQL resolvers map
 */
export function defineGraphQLResolvers(resolvers: Resolvers): Resolvers {
  return resolvers
}

export function gql(strings: TemplateStringsArray, ...values: any[]): string {
  let result = ''
  strings.forEach((string, i) => {
    result += string
    if (i < values.length) {
      result += values[i]
    }
  })
  return result
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | undefined

  return function (...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
