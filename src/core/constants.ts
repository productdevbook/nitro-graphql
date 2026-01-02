/**
 * Constants and magic strings used throughout nitro-graphql core
 * Centralizing these values prevents typos and makes refactoring easier
 */

import {
  CurrencyResolver,
  DateTimeISOResolver,
  DateTimeResolver,
  JSONObjectResolver,
  JSONResolver,
  NonEmptyStringResolver,
  UUIDResolver,
} from 'graphql-scalars'

// ==================== DEFAULT GRAPHQL SCALARS ====================

/**
 * Default scalar type mappings for GraphQL codegen
 * These scalars are commonly used and have proper TypeScript type mappings
 */
export const DEFAULT_GRAPHQL_SCALARS = {
  DateTime: DateTimeResolver.extensions.codegenScalarType as string,
  DateTimeISO: DateTimeISOResolver.extensions.codegenScalarType as string,
  UUID: UUIDResolver.extensions.codegenScalarType as string,
  JSON: JSONResolver.extensions.codegenScalarType as string,
  JSONObject: JSONObjectResolver.extensions.codegenScalarType as string,
  NonEmptyString: NonEmptyStringResolver.extensions.codegenScalarType as string,
  Currency: CurrencyResolver.extensions.codegenScalarType as string,
  File: {
    input: 'File',
    output: 'File',
  },
} as const

// ==================== FILE EXTENSIONS ====================

/**
 * GraphQL schema file extensions
 */
export const GRAPHQL_EXTENSIONS = ['.graphql', '.gql'] as const

/**
 * Resolver file extensions
 */
export const RESOLVER_EXTENSIONS = ['.resolver.ts', '.resolver.js'] as const

/**
 * Directive file extensions
 */
export const DIRECTIVE_EXTENSIONS = ['.directive.ts', '.directive.js'] as const

/**
 * Combined pattern for glob scanning
 */
export const GLOB_SCAN_PATTERN = '**/*.{graphql,gql,js,mjs,cjs,ts,mts,cts,tsx,jsx}' as const

/**
 * GraphQL file pattern for glob
 */
export const GRAPHQL_GLOB_PATTERN = '**/*.graphql' as const

/**
 * Resolver file pattern for glob
 */
export const RESOLVER_GLOB_PATTERN = '**/*.resolver.{ts,js}' as const

/**
 * Directive file pattern for glob
 */
export const DIRECTIVE_GLOB_PATTERN = '**/*.directive.{ts,js}' as const

// ==================== FRAMEWORK IDENTIFIERS ====================

/**
 * Framework names
 */
export const FRAMEWORK_NUXT = 'nuxt' as const
export const FRAMEWORK_NITRO = 'nitro' as const
export const FRAMEWORK_STANDALONE = 'standalone' as const

/**
 * GraphQL server framework identifiers
 */
export const GRAPHQL_FRAMEWORK_YOGA = 'graphql-yoga' as const
export const GRAPHQL_FRAMEWORK_APOLLO = 'apollo-server' as const

export type Framework = typeof FRAMEWORK_NUXT | typeof FRAMEWORK_NITRO | typeof FRAMEWORK_STANDALONE
export type GraphQLFramework = typeof GRAPHQL_FRAMEWORK_YOGA | typeof GRAPHQL_FRAMEWORK_APOLLO

// ==================== DIRECTORY NAMES ====================

/**
 * Default directory names for GraphQL files
 */
export const DIR_SERVER_GRAPHQL = 'server/graphql' as const
export const DIR_ROUTES_GRAPHQL = 'routes/graphql' as const
export const DIR_APP_GRAPHQL = 'app/graphql' as const
export const DIR_CLIENT_GRAPHQL = 'graphql' as const
export const DIR_EXTERNAL = 'external' as const

/**
 * Windows-compatible server GraphQL directory
 */
export const DIR_SERVER_GRAPHQL_WIN = 'server\\graphql' as const

/**
 * Build directory names
 */
export const DIR_BUILD_NITRO = '.nitro' as const
export const DIR_BUILD_NUXT = '.nuxt' as const

// ==================== DEFAULT ENDPOINTS ====================

/**
 * Default GraphQL endpoint paths
 */
export const ENDPOINT_GRAPHQL = '/api/graphql' as const
export const ENDPOINT_HEALTH = '/api/graphql/health' as const
export const ENDPOINT_DEBUG = '/_nitro/graphql/debug' as const

// ==================== FILE NAMES ====================

/**
 * Configuration and scaffold file names
 */
export const FILE_GRAPHQL_CONFIG = 'graphql.config.ts' as const
export const FILE_SCHEMA_GRAPHQL = 'schema.graphql' as const
export const FILE_SCHEMA_TS = 'schema.ts' as const
export const FILE_CONFIG_TS = 'config.ts' as const
export const FILE_CONTEXT_DTS = 'context.d.ts' as const
export const FILE_CONTEXT_TS = 'context.ts' as const // Old, deprecated
export const FILE_INDEX_TS = 'index.ts' as const
export const FILE_OFETCH_TS = 'ofetch.ts' as const
export const FILE_SDK_TS = 'sdk.ts' as const
export const FILE_DIRECTIVES_GRAPHQL = '_directives.graphql' as const

/**
 * Generated type definition file names
 */
export const FILE_SERVER_TYPES = 'nitro-graphql-server.d.ts' as const
export const FILE_CLIENT_TYPES = 'nitro-graphql-client.d.ts' as const
export const FILE_GRAPHQL_DTS = 'graphql.d.ts' as const

/**
 * Generated type file name patterns with placeholders
 */
export const PATTERN_CLIENT_EXTERNAL_TYPES = 'nitro-graphql-client-{serviceName}.d.ts' as const

// ==================== CHUNK NAMES ====================

/**
 * Rollup/Rolldown chunk output paths
 */
export const CHUNK_PATH_GRAPHQL = 'chunks/graphql/[name].mjs' as const
export const CHUNK_PATH_UNKNOWN = 'chunks/_/[name].mjs' as const

/**
 * Default chunk names
 */
export const CHUNK_NAME_SCHEMAS = 'schemas' as const
export const CHUNK_NAME_RESOLVERS = 'resolvers' as const

// ==================== DEFINE FUNCTIONS ====================

/**
 * Valid define function names for resolver exports
 */
export const DEFINE_FUNCTIONS = [
  'defineResolver',
  'defineQuery',
  'defineMutation',
  'defineField',
  'defineSubscription',
  'defineDirective',
] as const

export const DEFINE_RESOLVER = 'defineResolver' as const
export const DEFINE_QUERY = 'defineQuery' as const
export const DEFINE_MUTATION = 'defineMutation' as const
export const DEFINE_FIELD = 'defineField' as const
export const DEFINE_SUBSCRIPTION = 'defineSubscription' as const
export const DEFINE_DIRECTIVE = 'defineDirective' as const
export const DEFINE_GRAPHQL_CONFIG = 'defineGraphQLConfig' as const
export const DEFINE_SCHEMA = 'defineSchema' as const

export type DefineFunction = typeof DEFINE_FUNCTIONS[number]

// ==================== BUILT-IN GRAPHQL SCALARS ====================

/**
 * Built-in GraphQL scalar types (should not be flagged as duplicates)
 */
export const BUILTIN_SCALARS = [
  'String',
  'Int',
  'Float',
  'Boolean',
  'ID',
  'DateTime',
  'JSON',
] as const

// ==================== EXTERNAL DEPENDENCIES ====================

/**
 * Codegen parser dependencies (always external)
 */
export const CODEGEN_EXTERNALS = [
  'oxc-parser',
  '@oxc-parser',
] as const

/**
 * Apollo Federation dependencies (external when federation disabled)
 */
export const FEDERATION_EXTERNALS = [
  '@apollo/subgraph',
  '@apollo/federation-internals',
  '@apollo/cache-control-types',
] as const

// ==================== HTTP METHODS ====================

/**
 * Supported HTTP methods for GraphQL endpoints
 */
export const GRAPHQL_HTTP_METHODS = ['GET', 'POST', 'OPTIONS'] as const

// ==================== DEFAULT TYPE PATHS ====================

/**
 * Default paths for type generation (relative to buildDir)
 */
export const DEFAULT_SERVER_TYPES_PATH = '.graphql/nitro-graphql-server.d.ts' as const
export const DEFAULT_CLIENT_TYPES_PATH = '.graphql/nitro-graphql-client.d.ts' as const

// ==================== RESOLVER EXPORT TYPES ====================

/**
 * Valid resolver export types detected from AST parsing
 */
export const RESOLVER_TYPE_QUERY = 'query' as const
export const RESOLVER_TYPE_MUTATION = 'mutation' as const
export const RESOLVER_TYPE_RESOLVER = 'resolver' as const
export const RESOLVER_TYPE_TYPE = 'type' as const
export const RESOLVER_TYPE_SUBSCRIPTION = 'subscription' as const
export const RESOLVER_TYPE_DIRECTIVE = 'directive' as const

export type ResolverType
  = | typeof RESOLVER_TYPE_QUERY
    | typeof RESOLVER_TYPE_MUTATION
    | typeof RESOLVER_TYPE_RESOLVER
    | typeof RESOLVER_TYPE_TYPE
    | typeof RESOLVER_TYPE_SUBSCRIPTION
    | typeof RESOLVER_TYPE_DIRECTIVE

// ==================== PATH PLACEHOLDERS ====================

/**
 * Placeholder strings used in path resolution
 */
export const PLACEHOLDER_SERVICE_NAME = '{serviceName}' as const
export const PLACEHOLDER_BUILD_DIR = '{buildDir}' as const
export const PLACEHOLDER_ROOT_DIR = '{rootDir}' as const
export const PLACEHOLDER_FRAMEWORK = '{framework}' as const
export const PLACEHOLDER_TYPES_DIR = '{typesDir}' as const
export const PLACEHOLDER_SERVER_DIR = '{serverDir}' as const
export const PLACEHOLDER_CLIENT_DIR = '{clientDir}' as const

// ==================== LOG TAGS ====================

/**
 * Logger tag for nitro-graphql module
 */
export const LOG_TAG = 'nitro-graphql' as const

// ==================== ERROR CODES ====================

/**
 * HTTP status codes for error handling
 */
export const HTTP_STATUS_BAD_REQUEST = 400 as const
export const HTTP_STATUS_INTERNAL_ERROR = 500 as const

// ==================== SERVICE DIRECTORY ====================

/**
 * Default service directory name for main service
 */
export const SERVICE_DEFAULT = 'default' as const
