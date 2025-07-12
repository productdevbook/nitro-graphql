import { defs } from '#nitro-internal-virtual/server-defs'
import { resolvers } from '#nitro-internal-virtual/server-resolvers'

import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import { createSchema } from 'graphql-yoga'

export function createMergedSchema() {
  try {
    const mergedDefs = defs.map(schema => schema.def).join('\n\n')
    const typeDefs = mergeTypeDefs([mergedDefs])
    const mergedResolvers = mergeResolvers(resolvers.map(r => r.resolver))

    return createSchema({
      typeDefs,
      resolvers: mergedResolvers,
    })
  }
  catch (error) {
    console.error('Schema merge error:', error)
    throw error
  }
}
