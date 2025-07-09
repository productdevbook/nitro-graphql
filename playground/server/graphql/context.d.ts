import type { YogaInitialContext } from 'graphql-yoga'
import type { H3Event } from 'h3'

export interface GraphQLContext extends YogaInitialContext {
  event: H3Event
  storage: any
}
