import type { Container } from '@vercube/di';

/**
 * GraphQL Context for Vercube
 * This is passed to all resolvers as the third argument
 */
export interface GraphQLContext {
  /** Original HTTP request */
  request: Request
  /** Vercube DI container */
  container: Container
}

export{};