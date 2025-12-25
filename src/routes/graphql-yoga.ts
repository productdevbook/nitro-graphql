import type { YogaServerInstance } from 'graphql-yoga'
import { importedConfig } from '#nitro-graphql/graphql-config'
import { moduleConfig } from '#nitro-graphql/module-config'
import { directives } from '#nitro-graphql/server-directives'
import { resolvers } from '#nitro-graphql/server-resolvers'
import { schemas } from '#nitro-graphql/server-schemas'
import defu from 'defu'
import { createYoga } from 'graphql-yoga'
import { defineEventHandler } from 'nitro/h3'
import { createMergedSchema } from '../utils/schema-builder'

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

let yoga: YogaServerInstance<object, object>

export default defineEventHandler(async (event) => {
  if (!yoga) {
    const schema = await createMergedSchema({
      schemas,
      resolvers,
      directives,
      moduleConfig,
    })

    // Get security config from module config (resolved with environment defaults)
    const securityConfig = moduleConfig.security || {
      introspection: true,
      playground: true,
      maskErrors: false,
      disableSuggestions: false,
    }

    // Yoga instance'ı henüz oluşturulmadıysa, oluştur
    yoga = createYoga(defu({
      schema,
      graphqlEndpoint: '/api/graphql',
      // Apply security settings
      landingPage: securityConfig.playground,
      graphiql: securityConfig.playground
        ? { defaultQuery: '# Welcome to GraphQL\n#\n# Try running a query!\n' }
        : false,
      renderGraphiQL: securityConfig.playground ? () => apolloSandboxHtml : undefined,
      // Mask errors in production
      maskedErrors: securityConfig.maskErrors,
    }, importedConfig))
  }
  const response = await yoga.handleRequest(event.req, event as unknown as Record<string, unknown>)

  // If resolver set a custom status code via event.res.status, use it
  if (event.res.status && event.res.status !== 200) {
    return new Response(response.body, {
      ...response,
      status: event.res.status,
    })
  }

  return new Response(response.body, response)
})
