import type { Resolvers } from '../types'

export function createResolver<TResolvers extends Resolvers = Resolvers>(
  resolvers: TResolvers
): TResolvers {
  return resolvers
}

export function defineGraphQLResolver<TResolvers extends Resolvers = Resolvers>(
  resolvers: TResolvers
): TResolvers {
  return resolvers
}