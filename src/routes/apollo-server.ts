import type { BaseContext } from '@apollo/server'
import { importedConfig } from '#nitro-internal-virtual/graphql-config'
import { directives } from '#nitro-internal-virtual/server-directives'
import { resolvers } from '#nitro-internal-virtual/server-resolvers'
import { schemas } from '#nitro-internal-virtual/server-schemas'
import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
// TODO: fix bug
// import { startServerAndCreateH3Handler } from '@as-integrations/h3'
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import defu from 'defu'
import { parse } from 'graphql'
import { defineEventHandler } from 'h3'
import { startServerAndCreateH3Handler } from '../utils/apollo'

// Conditional imports for federation support - use dynamic import inside function
let buildSubgraphSchema: any = null

async function loadFederationSupport() {
  if (buildSubgraphSchema !== null)
    return buildSubgraphSchema

  try {
    // Try to import @apollo/subgraph for federation support
    const apolloSubgraph = await import('@apollo/subgraph')
    buildSubgraphSchema = apolloSubgraph.buildSubgraphSchema
  }
  catch {
    // @apollo/subgraph is optional, continue without federation
    buildSubgraphSchema = false
  }

  return buildSubgraphSchema
}

async function createMergedSchema() {
  try {
    const mergedSchemas = schemas.map(schema => schema.def).join('\n\n')
    const typeDefs = mergeTypeDefs([mergedSchemas], {
      throwOnConflict: true,
      commentDescriptions: true,
      sort: true,
    })
    const mergedResolvers = mergeResolvers(resolvers.map(r => r.resolver))

    // Check if federation is enabled via runtime config
    const federationEnabled = process.env.NITRO_GRAPHQL_FEDERATION === 'true'

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
        console.warn('Federation enabled but @apollo/subgraph not available, falling back to regular schema')
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
    console.error('Schema merge error:', error)
    throw error
  }
}

let apolloServer: ApolloServer<BaseContext> | null = null

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
  })

  return h3Handler(event)
})
