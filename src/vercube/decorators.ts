/**
 * Vercube decorators for GraphQL resolvers
 *
 * Type-safe decorators that work with generated resolver types.
 * Field names are automatically constrained to valid schema fields.
 *
 * @example
 * ```typescript
 * @Resolver()
 * class UserResolver {
 *   @Query('user')  // Type-safe: only valid Query fields allowed
 *   user(_parent: unknown, args: { id: string }, ctx: Context) {
 *     return ctx.db.users.find(args.id)
 *   }
 * }
 * ```
 */

import type { Resolvers } from '#graphql/server'
import type { ResolverMetadata } from './types'

// Extract resolver types from Resolvers
type QueryResolvers = NonNullable<Resolvers['Query']>
type MutationResolvers = NonNullable<Resolvers['Mutation']>
type SubscriptionResolvers = NonNullable<Resolvers['Subscription']>

// eslint-disable-next-line ts/no-unsafe-function-type -- Need generic Function for class decorators
type AnyClass = Function

// Static registry for resolver classes - populated at decoration time
export const resolverClasses: Set<AnyClass> = new Set()

/**
 * Mark a class as a GraphQL resolver
 */
export function Resolver(): ClassDecorator {
  // eslint-disable-next-line ts/no-unsafe-function-type -- ClassDecorator signature requires Function
  return (target: Function) => {
    resolverClasses.add(target)
  }
}

/**
 * Mark a method or property as a GraphQL Query resolver
 *
 * @example
 * // As property (recommended - auto type inference)
 * @Query('hello')
 * hello: QueryResolvers['hello'] = (_parent, _args, ctx) => {
 *   return 'Hello!'
 * }
 *
 * // As method
 * @Query('hello')
 * hello(_parent, _args, ctx) {
 *   return 'Hello!'
 * }
 */
export function Query(
  fieldName: keyof QueryResolvers & string,
): MethodDecorator & PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const constructor = target.constructor
    if (!constructor.__graphql_resolvers) {
      constructor.__graphql_resolvers = []
    }
    const metadata: ResolverMetadata = {
      type: 'Query',
      field: fieldName,
      propertyName: propertyKey as string,
    }
    constructor.__graphql_resolvers.push(metadata)
  }
}

/**
 * Mark a method or property as a GraphQL Mutation resolver
 *
 * @example
 * @Mutation('createUser')
 * createUser: MutationResolvers['createUser'] = (_parent, args, ctx) => {
 *   return ctx.db.users.create(args)
 * }
 */
export function Mutation(
  fieldName: keyof MutationResolvers & string,
): MethodDecorator & PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const constructor = target.constructor
    if (!constructor.__graphql_resolvers) {
      constructor.__graphql_resolvers = []
    }
    const metadata: ResolverMetadata = {
      type: 'Mutation',
      field: fieldName,
      propertyName: propertyKey as string,
    }
    constructor.__graphql_resolvers.push(metadata)
  }
}

/**
 * Mark a method or property as a GraphQL Subscription resolver
 *
 * @example
 * @Subscription('messageAdded')
 * messageAdded: SubscriptionResolvers['messageAdded'] = (_parent, _args, ctx) => {
 *   return ctx.pubsub.subscribe('MESSAGE_ADDED')
 * }
 */
export function Subscription(
  fieldName: keyof SubscriptionResolvers & string,
): MethodDecorator & PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const constructor = target.constructor
    if (!constructor.__graphql_resolvers) {
      constructor.__graphql_resolvers = []
    }
    const metadata: ResolverMetadata = {
      type: 'Subscription',
      field: fieldName,
      propertyName: propertyKey as string,
    }
    constructor.__graphql_resolvers.push(metadata)
  }
}

/**
 * Mark a method or property as a Field resolver for a specific type
 *
 * @example
 * @FieldResolver('User', 'posts')
 * posts: UserResolvers['posts'] = (parent, _args, ctx) => {
 *   return ctx.db.posts.findByUserId(parent.id)
 * }
 */
export function FieldResolver<TType extends keyof Resolvers & string>(
  typeName: TType,
  fieldName: keyof NonNullable<Resolvers[TType]> & string,
): MethodDecorator & PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const constructor = target.constructor
    if (!constructor.__graphql_resolvers) {
      constructor.__graphql_resolvers = []
    }
    const metadata: ResolverMetadata = {
      type: typeName,
      field: fieldName,
      propertyName: propertyKey as string,
    }
    constructor.__graphql_resolvers.push(metadata)
  }
}
