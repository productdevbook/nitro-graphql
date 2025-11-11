import type { GraphQLSchema } from 'graphql'
import { moduleConfig } from '#nitro-graphql/module-config'
import { directives } from '#nitro-graphql/server-directives'
import { resolvers } from '#nitro-graphql/server-resolvers'
import { schemas } from '#nitro-graphql/server-schemas'
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { parse } from 'graphql'

// Conditional imports for federation support
let buildSubgraphSchema: any = null

async function loadFederationSupport() {
  if (buildSubgraphSchema !== null)
    return buildSubgraphSchema

  try {
    const apolloSubgraph = await import('@apollo/subgraph')
    buildSubgraphSchema = apolloSubgraph.buildSubgraphSchema
  }
  catch {
    buildSubgraphSchema = false
  }

  return buildSubgraphSchema
}

export async function createMergedSchema(): Promise<GraphQLSchema> {
  try {
    const mergedSchemas = schemas.map(schema => schema.def).join('\n\n')
    const typeDefs = mergeTypeDefs([mergedSchemas], {
      throwOnConflict: true,
      commentDescriptions: true,
      sort: true,
    })
    const mergedResolvers = mergeResolvers(resolvers.map(r => r.resolver))

    const federationEnabled = moduleConfig.federation?.enabled

    let schema: GraphQLSchema

    if (federationEnabled) {
      const buildSubgraph = await loadFederationSupport()

      if (buildSubgraph) {
        const typeDefsDoc = typeof typeDefs === 'string' ? parse(typeDefs) : typeDefs

        schema = buildSubgraph({
          typeDefs: typeDefsDoc,
          resolvers: mergedResolvers,
        })
      }
      else {
        console.warn('[GraphQL WS] Federation enabled but @apollo/subgraph not available, falling back to regular schema')
        schema = makeExecutableSchema({
          typeDefs,
          resolvers: mergedResolvers,
        })
      }
    }
    else {
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
    console.error('[GraphQL WS] Schema merge error:', error)
    throw error
  }
}
