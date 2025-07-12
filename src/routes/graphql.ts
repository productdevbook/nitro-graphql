import type { YogaServerInstance } from 'graphql-yoga'
import { defs } from '#nitro-internal-virtual/server-defs'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { createSchema, createYoga } from 'graphql-yoga'
import { defineEventHandler } from 'h3'

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

let yoga: YogaServerInstance<object, object>

export default defineEventHandler(async (event) => {
  const mergedDefs = defs.map(schema => schema.def).join('\n\n')

  const typeDefs = mergeTypeDefs([mergedDefs])
  // GraphQL şeması ve resolver'ları birlikte tanımla
  const schema = createSchema({
    typeDefs,
    resolvers: {
      Query: {
      },
      Mutation: {
      },
    },
  })

  if (!yoga) {
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
