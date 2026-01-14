/**
 * Vercube-specific types for GraphQL integration
 */

/**
 * Resolver metadata stored by decorators
 */
export interface ResolverMetadata {
  /** GraphQL type (Query, Mutation, Subscription, or custom type for FieldResolver) */
  type: string
  /** Field name in the GraphQL schema */
  field: string
  /** Property name on the resolver class */
  propertyName: string
}
