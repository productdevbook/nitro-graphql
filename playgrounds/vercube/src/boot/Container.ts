import type { Container } from '@vercube/di'
import FooController from '@/controller/FooController'
import { GraphQLController } from '@/controller/GraphQLController'
import { HelloResolver } from '@/Resolvers/HelloResolver'

export function useContainer(container: Container): void {
  // register controllers
  container.bind(FooController)
  container.bind(GraphQLController)

  // register GraphQL resolvers
  container.bind(HelloResolver)
}
