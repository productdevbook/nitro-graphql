import type { Nitro } from 'nitropack/types'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { defineNitroModule } from 'nitropack/kit'

export default defineNitroModule({
  name: 'nitro:graphql-yoga',
  async setup(nitro: Nitro) {
    // Auto-scan for GraphQL schema files
    const possibleSchemaPaths = [
      'server/graphql/schema.ts',
      'server/graphql/index.ts',
      'graphql/schema.ts',
      'graphql/index.ts',
    ]

    let schemaPath = ''
    for (const path of possibleSchemaPaths) {
      const fullPath = join(nitro.options.srcDir, path)
      if (existsSync(fullPath)) {
        schemaPath = fullPath
        break
      }
    }

    // Check for GraphQL Yoga config file
    const possibleConfigPaths = [
      'server/graphql/yoga.config.ts',
      'server/graphql-yoga.config.ts',
      'graphql/yoga.config.ts',
      'graphql-yoga.config.ts',
    ]

    let configPath = ''
    for (const path of possibleConfigPaths) {
      const fullPath = join(nitro.options.srcDir, path)
      if (existsSync(fullPath)) {
        configPath = fullPath
        console.log(`[nitro-graphql-yoga] Found config file at: ${path}`)
        break
      }
    }

    // Add GraphQL Yoga handlers
    nitro.options.handlers = nitro.options.handlers || []

    // Main GraphQL endpoint - add handlers for each method
    const endpoint = nitro.options.runtimeConfig.graphqlYoga?.endpoint || '/api/graphql'

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
      route: `${nitro.options.runtimeConfig.graphqlYoga?.endpoint || '/api/graphql'}/health`,
      handler: '#nitro-graphql-yoga/health',
      method: 'get',
    })

    // Add virtual imports
    nitro.options.virtual = nitro.options.virtual || {}

    // Health check handler
    nitro.options.virtual['#nitro-graphql-yoga/health'] = () => `
import { defineEventHandler, setResponseStatus } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const response = await $fetch('${nitro.options.runtimeConfig.graphqlYoga?.endpoint || '/api/graphql'}', {
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

    // GraphQL handler
    nitro.options.virtual['#nitro-graphql-yoga/handler'] = () => {
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

      return `
import { createYoga } from 'graphql-yoga'
import { defineEventHandler, readRawBody, setHeader, setResponseStatus } from 'h3'
import { useStorage } from 'nitro/runtime'
${configPath ? `import defu from 'defu'` : ''}
${schemaPath ? `import { schema } from '${schemaPath.replace(/\.[tj]s$/, '')}'` : `import { getGraphQLSchema } from '#nitro-graphql-yoga/schema'`}
${configPath ? `import yogaConfig from '${configPath.replace(/\.[tj]s$/, '')}'` : ''}

const defaultConfig = {
  schema: ${schemaPath ? 'schema' : 'getGraphQLSchema()'},
  context: async ({ request }) => {
    const event = request.$$event
    return {
      event,
      request,
      storage: useStorage(),
    }
  },
  graphqlEndpoint: '${nitro.options.runtimeConfig.graphqlYoga?.endpoint || '/api/graphql'}',
  graphiql: ${nitro.options.runtimeConfig.graphqlYoga?.playground !== false},
  renderGraphiQL: () => {
    return ${JSON.stringify(apolloSandboxHtml)}
  },
  landingPage: false,
  cors: ${JSON.stringify(nitro.options.runtimeConfig.graphqlYoga?.cors || false)},
}

const yoga = createYoga(${configPath ? 'defu(yogaConfig, defaultConfig)' : 'defaultConfig'})

export default defineEventHandler(async (event) => {
  const { req } = event.node
  const host = req.headers.host || 'localhost'
  const protocol = 'http'
  const url = new URL(req.url || '/', protocol + '://' + host)
  
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
  
  // Add cache headers for GET requests
  const cacheConfig = ${JSON.stringify(nitro.options.runtimeConfig.graphqlYoga?.cacheHeaders || { enabled: true, maxAge: 2592000 })}
  if (event.method === 'GET' && cacheConfig.enabled) {
    const maxAge = cacheConfig.maxAge || 2592000
    setHeader(event, 'Cache-Control', 'public, max-age=' + maxAge + ', immutable')
  }
  
  // Set status code
  setResponseStatus(event, response.status)
  
  // Get response body as text or stream
  if (response.body) {
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('text/html') || contentType?.includes('application/json')) {
      return await response.text()
    }
    // For streams or other content types
    return response.body
  }
  
  return null
})
`
    }

    // Default schema if no schema file is found
    if (!schemaPath) {
      console.warn('[nitro-graphql-yoga] No GraphQL schema file found. Using default schema.')
      console.warn('[nitro-graphql-yoga] Please create a schema file at one of these locations:')
      possibleSchemaPaths.forEach(path => console.warn(`  - ${path}`))

      nitro.options.virtual['#nitro-graphql-yoga/schema'] = () => `
import { makeExecutableSchema } from '@graphql-tools/schema'
import { GraphQLError } from 'graphql'

const typeDefs = \`
  type Query {
    hello: String
    error: String
  }
\`

const resolvers = {
  Query: {
    hello: () => 'Hello from Nitro GraphQL Yoga! ⚠️ No schema file found.',
    error: () => {
      throw new GraphQLError(
        'No GraphQL schema file found. Please create a schema file at one of these locations: ' + 
        ${JSON.stringify(possibleSchemaPaths.join(', '))},
        {
          extensions: {
            code: 'SCHEMA_NOT_FOUND',
            locations: ${JSON.stringify(possibleSchemaPaths)},
          },
        }
      )
    },
  },
}

export function getGraphQLSchema() {
  return makeExecutableSchema({
    typeDefs,
    resolvers,
  })
}
`
    }

    // Auto-import GraphQL utilities
    nitro.options.imports = nitro.options.imports || {}
    nitro.options.imports.presets = nitro.options.imports.presets || []
    nitro.options.imports.presets.push({
      from: 'nitro-graphql-yoga',
      imports: [
        'defineGraphQLResolver',
        'defineGraphQLSchema',
        'gql',
      ],
    })
  },
})

export * from './types'
export * from './utils'
