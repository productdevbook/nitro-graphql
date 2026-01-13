/**
 * Core Server Types
 *
 * Shared types for GraphQL server creation used by both Nitro and CLI.
 */

import type { GraphQLSchema } from 'graphql'
import type { DirectiveWrapper, ModuleConfig, ResolverDefinition, SchemaDefinition } from '../schema/builder'

/**
 * Security configuration for GraphQL server
 */
export interface CoreSecurityConfig {
  /** Enable GraphQL introspection (default: true in dev, false in prod) */
  introspection?: boolean
  /** Enable GraphQL playground/sandbox (default: true in dev, false in prod) */
  playground?: boolean
  /** Mask error messages in responses (default: false in dev, true in prod) */
  maskErrors?: boolean
  /** Disable field suggestions in error messages */
  disableSuggestions?: boolean
}

/**
 * Options for creating a GraphQL server instance
 */
export interface CoreServerOptions {
  /** Schema definitions (GraphQL SDL strings) */
  schemas: SchemaDefinition[]
  /** Resolver definitions */
  resolvers: ResolverDefinition[]
  /** Directive definitions (optional) */
  directives?: DirectiveWrapper[]
  /** Module configuration (federation, etc.) */
  moduleConfig: ModuleConfig
  /** GraphQL endpoint path (default: /api/graphql) */
  endpoint?: string
  /** Security configuration */
  security?: CoreSecurityConfig
  /** User's imported GraphQL config (from defineGraphQLConfig) */
  importedConfig?: Record<string, unknown>
}

/**
 * GraphQL server instance returned by server factories
 */
export interface CoreServerInstance {
  /**
   * Handle a request using the web standard fetch API
   * Compatible with srvx, Bun, Deno, and Node.js
   */
  fetch: (request: Request, context?: Record<string, unknown>) => Promise<Response>
  /** The compiled GraphQL schema */
  schema: GraphQLSchema
}

/**
 * Factory function type for creating GraphQL servers
 */
export type ServerFactory = (options: CoreServerOptions) => Promise<CoreServerInstance>
