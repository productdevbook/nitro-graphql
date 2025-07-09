import type { YogaServerOptions } from 'graphql-yoga'
import type { IncomingMessage, ServerResponse } from 'node:http'

export interface GraphQLSchemaConfig {
  typeDefs: string | string[]
  resolvers: any
}

export interface NitroGraphQLYogaOptions {
  endpoint?: string
  healthCheckEndpoint?: string
  playground?: boolean
  cors?: YogaServerOptions<{ req: IncomingMessage, res: ServerResponse }, any>['cors']
  cacheHeaders?: {
    enabled?: boolean
    maxAge?: number
  }
}

declare module 'nitropack' {
  interface NitroRuntimeConfig {
    graphqlYoga?: NitroGraphQLYogaOptions
  }
}

export interface Resolvers {}
