import type { BaseContext } from '@apollo/server'
import { defs } from '#nitro-internal-virtual/server-defs'
import { resolvers } from '#nitro-internal-virtual/server-resolvers'
import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import { startServerAndCreateH3Handler } from '@as-integrations/h3'
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import { defineEventHandler } from 'h3'

function createMergedSchema() {
  try {
    const mergedDefs = defs.map(schema => schema.def).join('\n\n')
    const typeDefs = mergeTypeDefs([mergedDefs])
    const mergedResolvers = mergeResolvers(resolvers.map(r => r.resolver))

    return {
      typeDefs,
      resolvers: mergedResolvers,
    }
  }
  catch (error) {
    console.error('Schema merge error:', error)
    throw error
  }
}

const { typeDefs, resolvers: mergedResolvers } = createMergedSchema()

const apolloServer = new ApolloServer<BaseContext>({
  typeDefs,
  resolvers: mergedResolvers,
  introspection: true,
  plugins: [
    ApolloServerPluginLandingPageLocalDefault({ embed: true }),
  ],
})
const handler = startServerAndCreateH3Handler(apolloServer, {
  context: async event => ({ event }),
})
export default defineEventHandler((event) => {
  return handler(event)
})
