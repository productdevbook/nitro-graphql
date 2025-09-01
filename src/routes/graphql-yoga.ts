import type { YogaServerInstance } from 'graphql-yoga'
import { importedConfig } from '#nitro-internal-virtual/graphql-config'
import { moduleConfig } from '#nitro-internal-virtual/module-config'

import { directives } from '#nitro-internal-virtual/server-directives'
import { resolvers } from '#nitro-internal-virtual/server-resolvers'
import { schemas } from '#nitro-internal-virtual/server-schemas'

import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import defu from 'defu'
import { parse } from 'graphql'
import { createYoga } from 'graphql-yoga'
import { defineEventHandler, toWebRequest } from 'h3'
// TODO: https://github.com/nitrojs/nitro/issues/3403 if used import this error.
// import { createMergedSchema } from 'nitro-graphql/internal'

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

// function setApolloSandboxCacheHeaders(event) {
//   setHeader(event, 'Cache-Control', 'public, max-age=604800, s-maxage=604800')
//   setHeader(event, 'Expires', new Date(Date.now() + 604800000).toUTCString())
//   setHeader(event, 'ETag', `"apollo-sandbox-${Date.now()}"`)
// }

// Schema ve yoga instance'ını build time'da oluştur
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
    console.error('Schema merge error:', error)
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
  const request = toWebRequest(event)
  const response = await yoga.handleRequest(request, event as any)

  return new Response(response.body, response)
})
