import type { GraphQLResolveInfo } from 'graphql'
import type { GraphQLSchemaConfig } from './types'
import type { GraphQLContext } from './context'

export type ResolverFn<TResult = any, TParent = any, TContext = GraphQLContext, TArgs = any> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult

export interface ResolverMap {
  [key: string]: {
    [key: string]: ResolverFn
  }
}

export function defineGraphQLSchema(config: GraphQLSchemaConfig): GraphQLSchemaConfig {
  return config
}

export function defineGraphQLResolver<TResolvers extends ResolverMap = ResolverMap>(
  resolvers: TResolvers,
): TResolvers {
  return resolvers
}

export function createResolver<TResolvers extends ResolverMap = ResolverMap>(
  resolvers: TResolvers,
): TResolvers {
  return resolvers
}

/**
 * Define GraphQL resolvers map
 */
export function defineGraphQLResolvers(resolvers: ResolverMap): ResolverMap {
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
