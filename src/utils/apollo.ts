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
import type { WithRequired } from '@apollo/utils.withrequired'
import type { Hooks } from 'crossws'
import type {
  EventHandler,
  H3Event,
  HTTPMethod,
  RequestHeaders,
} from 'h3'
import { HeaderMap } from '@apollo/server'
import {
  eventHandler,
  getHeaders,
  isMethod,
  readBody,
  setHeaders,
} from 'h3'

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
    any
  > = () => Promise.resolve({})

  const contextFunction: ContextFunction<
    [H3ContextFunctionArgument],
    TContext
  > = options?.context ?? defaultContext

  return eventHandler({
    handler: async (event) => {
      const apolloServer = typeof server === 'function' ? server() : server

      // Only call start if the server hasn't already been started
      if (!options?.serverAlreadyStarted) {
        apolloServer.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests()
      }

      // Apollo-server doesn't handle OPTIONS calls, so we have to do this on our own
      // https://github.com/apollographql/apollo-server/blob/fa82c1d5299c4803f9ef8ae7fa2e367eadd8c0e6/packages/server/src/runHttpQuery.ts#L182-L192
      if (isMethod(event, 'OPTIONS')) {
        // send 204 response

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

        setHeaders(event, Object.fromEntries(headers))
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
    },
    websocket: options?.websocket,
  })
}

async function toGraphqlRequest(event: H3Event): Promise<HTTPGraphQLRequest> {
  return {
    method: event.req.method || 'POST',
    headers: normalizeHeaders(getHeaders(event)),
    search: normalizeQueryString(event.req.url),
    body: await normalizeBody(event),
  }
}

function normalizeHeaders(headers: RequestHeaders): HeaderMap {
  const headerMap = new HeaderMap()
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      headerMap.set(key, value.join(','))
    }
    else if (value) {
      headerMap.set(key, value)
    }
  }
  return headerMap
}

function normalizeQueryString(url: string | undefined): string {
  if (!url) {
    return ''
  }
  return url.split('?')[1] || ''
}

async function normalizeBody(event: H3Event): Promise<unknown> {
  const PayloadMethods: HTTPMethod[] = ['PATCH', 'POST', 'PUT', 'DELETE']
  if (isMethod(event, PayloadMethods)) {
    return await readBody(event)
  }
}
