import type { BaseContext } from '@apollo/server'
import { importedConfig } from '#nitro-graphql/graphql-config'
import { moduleConfig } from '#nitro-graphql/module-config'
import { directives } from '#nitro-graphql/server-directives'
import { resolvers } from '#nitro-graphql/server-resolvers'
import { schemas } from '#nitro-graphql/server-schemas'
import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { consola } from 'consola'
import defu from 'defu'
import { parse } from 'graphql'
import { startServerAndCreateH3Handler } from 'nitro-graphql/utils/apollo'
import { defineEventHandler } from 'nitro/h3'
import { loadFederationSupport, warnFederationUnavailable } from '../utils/federation'

async function createMergedSchema() {
  try {
    const mergedSchemas = schemas.map(schema => schema.def).join('\n\n')
    const typeDefs = mergeTypeDefs([mergedSchemas], {
      throwOnConflict: true,
      commentDescriptions: true,
      sort: true,
    })
    const mergedResolvers = mergeResolvers(resolvers.map(r => r.resolver))

    // Check if federation is enabled via config
    const federationEnabled = moduleConfig.federation?.enabled

    let schema

    if (federationEnabled) {
      // Load federation support dynamically
      const buildSubgraph = await loadFederationSupport()

      if (buildSubgraph) {
        // Use Apollo Federation buildSubgraphSchema
        // buildSubgraphSchema requires DocumentNode, convert string if needed
        const typeDefsDoc = typeof typeDefs === 'string' ? parse(typeDefs) : typeDefs

        schema = buildSubgraph({
          typeDefs: typeDefsDoc,
          resolvers: mergedResolvers,
        })
      }
      else {
        warnFederationUnavailable()
        schema = makeExecutableSchema({
          typeDefs,
          resolvers: mergedResolvers,
        })
      }
    }
    else {
      // Use regular schema builder
      schema = makeExecutableSchema({
        typeDefs,
        resolvers: mergedResolvers,
      })
    }

    // Apply directives if any
    if (directives && directives.length > 0) {
      for (const { directive } of directives) {
        if (directive.transformer) {
          schema = directive.transformer(schema)
        }
      }
    }

    return schema
  }
  catch (error) {
    consola.error('Schema merge error:', error)
    throw error
  }
}

let apolloServer: ApolloServer<BaseContext> | null = null
let serverStarted = false

async function createApolloServer() {
  if (!apolloServer) {
    const schema = await createMergedSchema()

    apolloServer = new ApolloServer<BaseContext>(defu({
      schema,
      introspection: true,
      plugins: [
        ApolloServerPluginLandingPageLocalDefault({ embed: true }),
      ],
    }, importedConfig))

    // Start the server only once after creation
    if (!serverStarted) {
      await apolloServer.start()
      serverStarted = true
    }
  }
  return apolloServer
}

// Create a wrapper that handles async Apollo Server creation
let serverPromise: Promise<ApolloServer<BaseContext>> | null = null

export default defineEventHandler(async (event) => {
  if (!serverPromise) {
    serverPromise = createApolloServer()
  }

  const server = await serverPromise
  const h3Handler = startServerAndCreateH3Handler(server, {
    context: async () => ({ event }),
    serverAlreadyStarted: true,
  })

  return h3Handler(event)
})
