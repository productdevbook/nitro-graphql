/**
 * Core Yoga Server Factory
 *
 * Creates a GraphQL Yoga server instance using web standard fetch API.
 * Used by both Nitro routes and CLI dev server.
 */

import type { SchemaDefinition } from '../schema/builder'
import type { CoreServerInstance, CoreServerOptions } from './types'
import { resolveSecurityDefaults } from './types'
import defu from 'defu'
import { createYoga } from 'graphql-yoga'
import { createMergedSchema } from '../schema/builder'

/**
 * Apollo Sandbox HTML template
 * Shared between CLI and Nitro for consistent playground experience
 */
export const apolloSandboxHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="preload" href="/api/graphql/sandbox.js" as="script">
</head>
<body style="margin: 0; overflow-x: hidden; overflow-y: hidden">
<div id="sandbox" style="height:100vh; width:100vw;"></div>
<script src="/api/graphql/sandbox.js"></script>
<script>
new window.EmbeddedSandbox({
  target: "#sandbox",
  initialEndpoint: window.location.href.replace('/sandbox.js', ''),
  hideCookieToggle: false,
  initialState: {
    includeCookies: true
  }
});
</script>
</body>
</html>`

/**
 * Create a GraphQL Yoga server instance
 *
 * This is the core server factory used by both:
 * - Nitro routes (via virtual module imports)
 * - CLI dev server (via file-based loading)
 *
 * @example
 * ```typescript
 * // In Nitro route
 * const server = await createYogaServer({
 *   schemas, resolvers, directives, moduleConfig,
 *   security: moduleConfig.security,
 *   importedConfig,
 * })
 *
 * // In CLI
 * const server = await createYogaServer({
 *   schemas: await loadSchemas(ctx),
 *   resolvers: await loadResolvers(ctx),
 *   moduleConfig: { federation: ctx.config.federation },
 *   endpoint: '/graphql',
 * })
 * ```
 */
export async function createYogaServer(options: CoreServerOptions): Promise<CoreServerInstance> {
  const {
    schemas,
    resolvers,
    directives,
    moduleConfig,
    endpoint = '/api/graphql',
    security,
    importedConfig,
  } = options

  // Create merged schema using core schema builder
  const schema = await createMergedSchema({
    schemas,
    resolvers,
    directives: directives || [],
    moduleConfig,
  })

  const securityConfig = resolveSecurityDefaults(security)

  // Create Yoga instance with merged config
  const yoga = createYoga(defu({
    schema,
    graphqlEndpoint: endpoint,
    // Apply security settings
    landingPage: securityConfig.playground,
    graphiql: securityConfig.playground
      ? { defaultQuery: '# Welcome to GraphQL\n#\n# Try running a query!\n' }
      : false,
    renderGraphiQL: securityConfig.playground ? () => apolloSandboxHtml : undefined,
    // Mask errors based on security config
    maskedErrors: securityConfig.maskErrors,
  }, importedConfig))

  return {
    // Yoga's fetch expects its own Request/ServerContext types which differ from standard Web API
    fetch: (request, context) => Promise.resolve(yoga.fetch(request as unknown as Request, context as Record<string, unknown>)),
    schema,
  }
}
