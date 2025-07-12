import type { YogaServerInstance } from 'graphql-yoga'
import { defs } from '#nitro-internal-virtual/server-defs'
import { resolvers } from '#nitro-internal-virtual/server-resolvers'

import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import { createSchema, createYoga } from 'graphql-yoga'
import { defineEventHandler } from 'h3'
// TODO: https://github.com/nitrojs/nitro/issues/3403 if used import this error.
// import { createMergedSchema } from 'nitro-graphql/internal'

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
function createMergedSchema() {
  try {
    const mergedDefs = defs.map(schema => schema.def).join('\n\n')
    const typeDefs = mergeTypeDefs([mergedDefs])
    const mergedResolvers = mergeResolvers(resolvers.map(r => r.resolver))

    return createSchema({
      typeDefs,
      resolvers: mergedResolvers,
    })
  }
  catch (error) {
    console.error('Schema merge error:', error)
    throw error
  }
}

let yoga: YogaServerInstance<object, object>

export default defineEventHandler(async (event) => {
  if (!yoga) {
    const schema = createMergedSchema()
    // Yoga instance'ı henüz oluşturulmadıysa, oluştur
    yoga = createYoga({
      schema,
      graphqlEndpoint: '/api/graphql',
      landingPage: false,
      renderGraphiQL: () => apolloSandboxHtml,
    })
  }

  return yoga.handle(event.node.req, event.node.res)
})
