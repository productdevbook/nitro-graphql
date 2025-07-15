/*
This file Copy from 'https://github.com/apollo-server-integrations/apollo-server-integration-h3/blob/main/src/index.ts'

There is a bug, after it is fixed, the will be used again

*/

import type { BaseContext } from '@apollo/server'
import { defs } from '#nitro-internal-virtual/server-defs'
import { resolvers } from '#nitro-internal-virtual/server-resolvers'
import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
// TODO: fix bug
// import { startServerAndCreateH3Handler } from '@as-integrations/h3'
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import { startServerAndCreateH3Handler } from '../utils/apollo'

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

let apolloServer: ApolloServer<BaseContext>

function createApolloServer() {
  if (!apolloServer) {
    const { typeDefs, resolvers: mergedResolvers } = createMergedSchema()

    apolloServer = new ApolloServer<BaseContext>({
      typeDefs,
      resolvers: mergedResolvers,
      introspection: true,
      plugins: [
        ApolloServerPluginLandingPageLocalDefault({ embed: true }),
      ],
    })
  }
  return apolloServer
}

export default startServerAndCreateH3Handler(createApolloServer, {
  context: async event => ({ event }),
})
