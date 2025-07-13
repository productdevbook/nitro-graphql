import { defineEventHandler, setResponseStatus } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'

export default defineEventHandler(async (event) => {
  const runtime = useRuntimeConfig()

  if (!runtime.graphql || !runtime.graphql.endpoint?.graphql) {
    setResponseStatus(event, 404)
    return {
      status: 'error',
      message: 'GraphQL health check endpoint is not configured',
      timestamp: new Date().toISOString(),
    }
  }

  try {
    const response = await $fetch(runtime.graphql!.endpoint?.graphql, {
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
  }
  catch (error) {
    setResponseStatus(event, 503)
    return {
      status: 'unhealthy',
      message: (error instanceof Error ? error.message : 'GraphQL server is not responding'),
      timestamp: new Date().toISOString(),
    }
  }
})
