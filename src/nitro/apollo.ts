/*
This file Copy from 'https://github.com/apollo-server-integrations/apollo-server-integration-h3/blob/main/src/index.ts'

There is a bug, after it is fixed, the will be used again

*/

import type {
  ApolloServer,
  BaseContext,
  ContextFunction,
  HTTPGraphQLRequest,
} from '@apollo/server'
import type { Hooks } from 'crossws'
import type {
  EventHandler,
  H3Event,
  HTTPMethod,
} from 'nitro/h3'
import { HeaderMap } from '@apollo/server'
import {
  eventHandler,
  getRequestURL,
  readBody,
} from 'nitro/h3'

// Inline utility type to avoid dependency on @apollo/utils.withrequired
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

export interface H3ContextFunctionArgument {
  event: H3Event
}

export interface H3HandlerOptions<TContext extends BaseContext> {
  context?: ContextFunction<[H3ContextFunctionArgument], TContext>
  websocket?: Partial<Hooks>
  serverAlreadyStarted?: boolean
}

export function startServerAndCreateH3Handler(
  server: ApolloServer<BaseContext> | (() => ApolloServer<BaseContext>),
  options?: H3HandlerOptions<BaseContext>,
): EventHandler
export function startServerAndCreateH3Handler<TContext extends BaseContext>(
  server: ApolloServer<TContext> | (() => ApolloServer<TContext>),
  options: WithRequired<H3HandlerOptions<TContext>, 'context'>,
): EventHandler
export function startServerAndCreateH3Handler<TContext extends BaseContext>(
  server: ApolloServer<TContext> | (() => ApolloServer<TContext>),
  options?: H3HandlerOptions<TContext>,
): EventHandler {
  const defaultContext: ContextFunction<
    [H3ContextFunctionArgument],
    TContext
  > = () => Promise.resolve({} as TContext)

  const contextFunction: ContextFunction<
    [H3ContextFunctionArgument],
    TContext
  > = options?.context ?? defaultContext

  return eventHandler(async (event) => {
    const apolloServer = typeof server === 'function' ? server() : server

    // Only call start if the server hasn't already been started
    if (!options?.serverAlreadyStarted) {
      apolloServer.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests()
    }

    // Apollo-server doesn't handle OPTIONS calls, so we have to do this on our own
    // https://github.com/apollographql/apollo-server/blob/fa82c1d5299c4803f9ef8ae7fa2e367eadd8c0e6/packages/server/src/runHttpQuery.ts#L182-L192
    if (event.req.method === 'OPTIONS') {
      // send 204 response
      event.res.status = 204
      return null
    }

    try {
      const graphqlRequest = await toGraphqlRequest(event)
      const { body, headers, status }
        = await apolloServer.executeHTTPGraphQLRequest({
          httpGraphQLRequest: graphqlRequest,
          context: () => contextFunction({ event }),
        })

      if (body.kind === 'chunked') {
        throw new Error('Incremental delivery not implemented')
      }

      for (const [key, value] of headers) {
        event.res.headers.set(key, value)
      }
      event.res.status = status || 200
      return body.string
    }
    catch (error) {
      if (error instanceof SyntaxError) {
        // This is what the apollo test suite expects
        event.res.status = 400
        return error.message
      }
      else {
        throw error
      }
    }
  })
}

async function toGraphqlRequest(event: H3Event): Promise<HTTPGraphQLRequest> {
  const url = getRequestURL(event)
  return {
    method: event.req.method || 'POST',
    headers: normalizeHeaders(Object.fromEntries(event.req.headers.entries())),
    search: url.search.slice(1), // Remove leading '?'
    body: await normalizeBody(event),
  }
}

function normalizeHeaders(headers: Record<string, string | undefined>): HeaderMap {
  const headerMap = new HeaderMap()
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      headerMap.set(key, value)
    }
  }
  return headerMap
}

async function normalizeBody(event: H3Event): Promise<unknown> {
  const PayloadMethods: HTTPMethod[] = ['PATCH', 'POST', 'PUT', 'DELETE']
  const method = event.req.method
  if (method && PayloadMethods.includes(method as HTTPMethod)) {
    return await readBody(event)
  }
}
