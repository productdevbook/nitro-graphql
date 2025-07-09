import type { GraphQLResolveInfo } from 'graphql'
import type { YogaInitialContext } from 'graphql-yoga'
import type { GraphQLSchemaConfig } from './types'

export interface NitroGraphQLContext extends YogaInitialContext {
  event: any
  storage: any
}

export type ResolverFn<TResult = any, TParent = any, TContext = NitroGraphQLContext, TArgs = any> = (
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

export function defineGraphQLResolver<T = any>(resolver: T): T {
  return resolver
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
