import type { BaseContext } from '@apollo/server'
import { importedConfig } from '#nitro-internal-virtual/graphql-config'
import { resolvers } from '#nitro-internal-virtual/server-resolvers'
import { schemas } from '#nitro-internal-virtual/server-schemas'
import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
// TODO: fix bug
// import { startServerAndCreateH3Handler } from '@as-integrations/h3'
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import defu from 'defu'
import { startServerAndCreateH3Handler } from '../utils/apollo'

function createMergedSchema() {
  try {
    const mergedSchemas = schemas.map(schema => schema.def).join('\n\n')
    const typeDefs = mergeTypeDefs([mergedSchemas])
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

let apolloServer: ApolloServer<BaseContext> | null = null

function createApolloServer() {
  if (!apolloServer) {
    const { typeDefs, resolvers: mergedResolvers } = createMergedSchema()

    apolloServer = new ApolloServer<BaseContext>(defu({
      typeDefs,
      resolvers: mergedResolvers,
      introspection: true,
      plugins: [
        ApolloServerPluginLandingPageLocalDefault({ embed: true }),
      ],
    }, importedConfig))
  }
  return apolloServer
}

export default startServerAndCreateH3Handler(
  apolloServer || createApolloServer,
  {
    context: async event => ({ event }),
  },
)
