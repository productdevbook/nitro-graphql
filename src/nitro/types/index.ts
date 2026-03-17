/**
 * Nitro GraphQL type definitions barrel export
 * All types are re-exported here to maintain the same public API
 */

// Module augmentation (side-effect import — must be loaded for augmentations to apply)
import './augmentation'

// Core scanning types (canonical source)
export type { ResolverImport, ScannedResolver } from '../../core/types/scanning'

// Scan state type
export type { GraphQLScanState } from './augmentation'

// Configuration types
export type {
  ClientUtilsConfig,
  CLIGraphQLOptions,
  ExplicitPathsExtendSource,
  ExtendSource,
  ExternalGraphQLService,
  ExternalServicePaths,
  FederationConfig,
  FileGenerationConfig,
  LocalDirExtendSource,
  NitroGraphQLOptions,
  PathsConfig,
  PubSubConfig,
  RuntimeConfig,
  SdkConfig,
  SSETransportConfig,
  SubscriptionsConfig,
  TypesConfig,
  WatchConfig,
  WebSocketTransportConfig,
} from './config'

// Define types (resolver definitions, directive types, codegen re-exports)
export type {
  ClientCodegenConfig,
  /** @deprecated Use ClientCodegenConfig instead */
  CodegenClientConfig,
  /** @deprecated Use ServerCodegenConfig instead */
  CodegenServerConfig,
  DefineDirectiveConfig,
  DefineServerConfig,
  DirectiveArg,
  DirectiveArgument,
  DirectiveDefinition,
  DirectiveLocationName,
  ExternalServiceCodegenConfig,
  Flatten,
  /** @deprecated Use SdkCodegenConfig instead */
  GenericSdkConfig,
  GraphQLArgumentType,
  GraphQLBaseType,
  GraphQLScalarType,
  SdkCodegenConfig,
  SecurityConfig,
  ServerCodegenConfig,
  StandardSchemaV1,
} from './define'
