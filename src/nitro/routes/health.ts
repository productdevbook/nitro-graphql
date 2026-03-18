import type { GraphQLSchema } from 'graphql'
import { moduleConfig } from '#nitro-graphql/module-config'
import { directives } from '#nitro-graphql/server-directives'
import { resolvers } from '#nitro-graphql/server-resolvers'
import { schemas } from '#nitro-graphql/server-schemas'
import { execute, parse } from 'graphql'
import { defineEventHandler } from 'nitro/h3'
import { createMergedSchema } from '../../core/schema'

let schema: GraphQLSchema | null = null

async function getSchema(): Promise<GraphQLSchema> {
  if (!schema) {
    schema = await createMergedSchema({
      schemas,
      resolvers,
      directives,
      moduleConfig,
    })
  }
  return schema
}

const HEALTH_QUERY = parse('query Health { __typename }')

export default defineEventHandler(async (event) => {
  try {
    const resolvedSchema = await getSchema()
    const result = await execute({ schema: resolvedSchema, document: HEALTH_QUERY })

    if (result.data) {
      return {
        status: 'healthy',
        message: 'GraphQL server is running',
        timestamp: new Date().toISOString(),
      }
    }

    throw new Error(result.errors?.map(e => e.message).join(', ') || 'Invalid response from GraphQL server')
  }
  catch (error) {
    event.res.status = 503
    event.res.statusText = 'Service Unavailable'
    return {
      status: 'unhealthy',
      message: (error instanceof Error ? error.message : 'GraphQL server is not responding'),
      timestamp: new Date().toISOString(),
    }
  }
})
