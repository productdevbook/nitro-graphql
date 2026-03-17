/**
 * Define types and re-exports
 * Resolver definition helpers, directive types, and standard schema
 */

import type { NPMConfig } from '#graphql/server'
import type { ApolloServerOptions } from '@apollo/server'
import type { YogaServerOptions } from 'graphql-yoga'
import type { H3Event } from 'nitro/h3'

// Re-export codegen types from core (authoritative definitions)
export type {
  ClientCodegenConfig,
  ExternalServiceCodegenConfig,
  SdkCodegenConfig,
  ServerCodegenConfig,
} from '../../core/types/codegen'

export type Flatten<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

export type DefineServerConfig<T extends NPMConfig = NPMConfig> = T['framework'] extends 'graphql-yoga'
  ? Partial<YogaServerOptions<H3Event, Partial<H3Event>>>
  : T['framework'] extends 'apollo-server'
    ? Partial<ApolloServerOptions<H3Event>>
    : Partial<YogaServerOptions<H3Event, Partial<H3Event>>> | Partial<ApolloServerOptions<H3Event>>

// Nitro-specific aliases for backward compatibility
export type { ServerCodegenConfig as CodegenServerConfig } from '../../core/types/codegen'

export type { ClientCodegenConfig as CodegenClientConfig } from '../../core/types/codegen'

export type { SdkCodegenConfig as GenericSdkConfig } from '../../core/types/codegen'

// Re-export SecurityConfig from core (single source of truth)
export type { CoreSecurityConfig as SecurityConfig } from '../../core/types/config'
// Re-export directive types from core (canonical definitions)
export type {
  DefineDirectiveConfig,
  DirectiveArg,
  DirectiveArgument,
  DirectiveDefinition,
  DirectiveLocationName,
  GraphQLArgumentType,
  GraphQLBaseType,
  GraphQLScalarType,
} from '../../core/types/define'
// Re-export StandardSchemaV1 from core (canonical definition)
export type { StandardSchemaV1 } from '../../core/types/standard-schema'
