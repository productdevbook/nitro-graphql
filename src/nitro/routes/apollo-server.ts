import type { BaseContext } from '@apollo/server'
import { importedConfig } from '#nitro-graphql/graphql-config'
import { moduleConfig } from '#nitro-graphql/module-config'
import { directives } from '#nitro-graphql/server-directives'
import { resolvers } from '#nitro-graphql/server-resolvers'
import { schemas } from '#nitro-graphql/server-schemas'
import type { EventHandler } from 'nitro/h3'
import { startServerAndCreateH3Handler } from 'nitro-graphql/apollo'
import { defineEventHandler } from 'nitro/h3'
import { BASE_SCHEMA_DEF } from '../../core/schema/builder'
import { createApolloServerInstance } from '../../core/server/apollo'

let serverPromise: Promise<import('@apollo/server').ApolloServer<BaseContext>> | null = null
let cachedH3Handler: EventHandler | null = null

export default defineEventHandler(async (event) => {
  if (!serverPromise) {
    // BASE_SCHEMA_DEF: empty Query/Mutation types for `extend type` syntax
    serverPromise = createApolloServerInstance({
      schemas: [BASE_SCHEMA_DEF, ...schemas],
      resolvers,
      directives,
      moduleConfig,
      security: moduleConfig.security,
      importedConfig,
    })
  }

  const server = await serverPromise

  if (!cachedH3Handler) {
    cachedH3Handler = startServerAndCreateH3Handler(server, {
      context: async (req: { event: typeof event }) => ({ event: req.event }),
      serverAlreadyStarted: true,
    })
  }

  return cachedH3Handler(event)
})
