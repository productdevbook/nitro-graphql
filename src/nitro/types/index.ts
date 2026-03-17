/**
 * Nitro GraphQL type definitions barrel export
 * All types are re-exported here to maintain the same public API
 */

// Module augmentation (side-effect import — must be loaded for augmentations to apply)
import './augmentation'

// Define types (resolver definitions, directive types, codegen re-exports)
export type {
  ClientCodegenConfig,
  CodegenClientConfig,
  CodegenServerConfig,
  DefineDirectiveConfig,
  DefineServerConfig,
  DirectiveArg,
  DirectiveArgument,
  DirectiveDefinition,
  DirectiveLocationName,
  ExternalServiceCodegenConfig,
  Flatten,
  GenericSdkConfig,
  GraphQLArgumentType,
  GraphQLBaseType,
  GraphQLScalarType,
  SdkCodegenConfig,
  SecurityConfig,
  ServerCodegenConfig,
  StandardSchemaV1,
} from './define'

// Configuration types
export type {
  CLIGraphQLOptions,
  ClientUtilsConfig,
  ExplicitPathsExtendSource,
  ExtendSource,
  ExternalGraphQLService,
  ExternalServicePaths,
  FederationConfig,
  FileGenerationConfig,
  GenImport,
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
