import type { YogaServerInstance } from 'graphql-yoga'
import { importedConfig } from '#nitro-graphql/graphql-config'
import { moduleConfig } from '#nitro-graphql/module-config'
import { directives } from '#nitro-graphql/server-directives'
import { resolvers } from '#nitro-graphql/server-resolvers'
import { schemas } from '#nitro-graphql/server-schemas'

import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { consola } from 'consola'
import defu from 'defu'
import { parse } from 'graphql'
import { createYoga } from 'graphql-yoga'
import { defineEventHandler } from 'nitro/h3'

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

// Apollo Sandbox HTML with 1 week cache
const apolloSandboxHtml = `<!DOCTYPE html>
<html lang="en">
<body style="margin: 0; overflow-x: hidden; overflow-y: hidden">
<div id="sandbox" style="height:100vh; width:100vw;"></div>
<script src="https://embeddable-sandbox.cdn.apollographql.com/02e2da0fccbe0240ef03d2396d6c98559bab5b06/embeddable-sandbox.umd.production.min.js"></script>
<script>
new window.EmbeddedSandbox({
  target: "#sandbox",
  initialEndpoint: window.location.href,
  hideCookieToggle: false,
  initialState: {
    includeCookies: true
  }
});
</script>
</body>
</html>`

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
    consola.error('Schema merge error:', error)
    throw error
  }
}

let yoga: YogaServerInstance<object, object>

export default defineEventHandler(async (event) => {
  if (!yoga) {
    const schema = await createMergedSchema()
    // Yoga instance'ı henüz oluşturulmadıysa, oluştur
    yoga = createYoga(defu({
      schema,
      graphqlEndpoint: '/api/graphql',
      landingPage: false,
      renderGraphiQL: () => apolloSandboxHtml,
    }, importedConfig))
  }
  const response = await yoga.handleRequest(event.req, event as any)

  // If resolver set a custom status code via event.res.status, use it
  if (event.res.status && event.res.status !== 200) {
    return new Response(response.body, {
      ...response,
      status: event.res.status,
    })
  }

  return new Response(response.body, response)
})
