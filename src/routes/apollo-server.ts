import type { BaseContext } from '@apollo/server'
import { importedConfig } from '#nitro-graphql/graphql-config'
import { moduleConfig } from '#nitro-graphql/module-config'
import { directives } from '#nitro-graphql/server-directives'
import { resolvers } from '#nitro-graphql/server-resolvers'
import { schemas } from '#nitro-graphql/server-schemas'
import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import defu from 'defu'
import { startServerAndCreateH3Handler } from 'nitro-graphql/utils/apollo'
import { defineEventHandler } from 'nitro/h3'
import { createMergedSchema } from '../utils/schema-builder'

let apolloServer: ApolloServer<BaseContext> | null = null
let serverStarted = false

async function createApolloServer() {
  if (!apolloServer) {
    const schema = await createMergedSchema({
      schemas,
      resolvers,
      directives,
      moduleConfig,
    })

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
