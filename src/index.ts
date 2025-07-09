import type { Nitro } from 'nitropack/types'
import { mkdir, writeFile } from 'node:fs/promises'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { consola } from 'consola'
import { defineNitroModule } from 'nitropack/kit'
import { join } from 'pathe'
import { generateTypes } from './codegen'
import { scanGraphQLFiles } from './scanner'
import { setupGraphQLWatcher } from './watcher'

export default defineNitroModule({
  name: 'nitro:graphql-yoga',
  async setup(nitro: Nitro) {
    // Add virtual imports
    nitro.options.virtual = nitro.options.virtual || {}

    // Add context type
    nitro.options.virtual['#nitro-graphql-yoga/context'] = () => `
export type { GraphQLContext } from 'nitro-graphql-yoga/context'
`

    // Initial scan
    const scanResult = scanGraphQLFiles(nitro)

    // Generate initial types if we have GraphQL files
    if (scanResult.typeDefs.length > 0) {
      const mergedTypeDefs = mergeTypeDefs(scanResult.typeDefs)
      const schema = makeExecutableSchema({
        typeDefs: mergedTypeDefs,
        resolvers: {},
      })

      const generatedTypes = await generateTypes(schema)

      // Write to file
      const outputPath = join(nitro.options.srcDir, 'graphql/types.generated.ts')
      await mkdir(join(nitro.options.srcDir, 'graphql'), { recursive: true })
      await writeFile(outputPath, generatedTypes)

      consola.success('[nitro-graphql-yoga] Generated types at:', outputPath)
    }

    // Setup file watcher in dev mode
    if (nitro.options.dev) {
      await setupGraphQLWatcher(nitro)
    }

    // Add GraphQL Yoga handlers
    nitro.options.handlers = nitro.options.handlers || []
    const endpoint = nitro.options.runtimeConfig.graphqlYoga?.endpoint || '/api/graphql'

    // Main GraphQL endpoint
    nitro.options.handlers.push({
      route: endpoint,
      handler: '#nitro-graphql-yoga/handler',
      method: 'get',
    })

    nitro.options.handlers.push({
      route: endpoint,
      handler: '#nitro-graphql-yoga/handler',
      method: 'post',
    })

    nitro.options.handlers.push({
      route: endpoint,
      handler: '#nitro-graphql-yoga/handler',
      method: 'options',
    })

    // Health check endpoint
    nitro.options.handlers.push({
      route: `${endpoint}/health`,
      handler: '#nitro-graphql-yoga/health',
      method: 'get',
    })

    // Create GraphQL handler
    nitro.options.virtual['#nitro-graphql-yoga/handler'] = () => `
import { createYoga } from 'graphql-yoga'
import { defineEventHandler, readRawBody, setHeader, setResponseStatus } from 'h3'
import { useStorage } from 'nitro/runtime'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge'
import { loadFilesSync } from '@graphql-tools/load-files'
import { join } from 'pathe'
// GraphQL Context type is injected via context module

// Load schema files
const typeDefs = loadFilesSync(join(process.cwd(), '${nitro.options.srcDir}/graphql/**/*.graphql'), {
  recursive: true,
})

// Load resolver files
const resolverFiles = loadFilesSync(join(process.cwd(), '${nitro.options.srcDir}/graphql/resolvers/**/*.{ts,js}'), {
  recursive: true,
  ignoreIndex: true,
})

// Merge schema and resolvers
const schema = makeExecutableSchema({
  typeDefs: mergeTypeDefs(typeDefs),
  resolvers: mergeResolvers(resolverFiles),
})

// Apollo Sandbox HTML
const apolloSandboxHtml = \`<!DOCTYPE html>
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
</html>\`

// Create Yoga instance
const yoga = createYoga({
  schema,
  context: async ({ request }) => {
    const event = request.$$event
    return {
      event,
      request,
      storage: useStorage(),
    }
  },
  graphqlEndpoint: '${endpoint}',
  graphiql: ${nitro.options.runtimeConfig.graphqlYoga?.playground !== false},
  renderGraphiQL: () => apolloSandboxHtml,
  landingPage: false,
  cors: ${JSON.stringify(nitro.options.runtimeConfig.graphqlYoga?.cors || false)},
})

export default defineEventHandler(async (event) => {
  const { req } = event.node
  const host = req.headers.host || 'localhost'
  const protocol = 'http'
  const url = new URL(req.url || '/', protocol + '://' + host)
  
  // Attach event to request for context
  ;(req as any).$$event = event
  
  const response = await yoga.fetch(url.toString(), {
    method: req.method || 'GET',
    headers: req.headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await readRawBody(event) : undefined,
  }, {
    event,
  })
  
  // Set response headers
  response.headers.forEach((value, key) => {
    setHeader(event, key, value)
  })
  
  // Set status code
  setResponseStatus(event, response.status)
  
  // Return response body
  if (response.body) {
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('text/html') || contentType?.includes('application/json')) {
      return await response.text()
    }
    return response.body
  }
  
  return null
})
`

    // Health check handler
    nitro.options.virtual['#nitro-graphql-yoga/health'] = () => `
import { defineEventHandler, setResponseStatus } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const response = await $fetch('${endpoint}', {
      method: 'POST',
      body: {
        query: 'query Health { __typename }',
        operationName: 'Health',
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })
    
    if (response && typeof response === 'object' && 'data' in response) {
      return {
        status: 'healthy',
        message: 'GraphQL server is running',
        timestamp: new Date().toISOString(),
      }
    }
    
    throw new Error('Invalid response from GraphQL server')
  } catch (error) {
    setResponseStatus(event, 503)
    return {
      status: 'unhealthy',
      message: error.message || 'GraphQL server is not responding',
      timestamp: new Date().toISOString(),
    }
  }
})
`

    // Auto-import utilities
    nitro.options.imports = nitro.options.imports || {}
    nitro.options.imports.presets = nitro.options.imports.presets || []
    nitro.options.imports.presets.push({
      from: 'nitro-graphql-yoga',
      imports: [
        'defineGraphQLResolver',
        'defineGraphQLSchema',
        'defineGraphQLResolvers',
        'gql',
      ],
    })
  },
})

export * from './codegen'
export * from './context'
export * from './types'
export * from './utils'
