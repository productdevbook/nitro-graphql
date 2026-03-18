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

// ==================== DEFAULT IGNORE PATTERNS ====================

/**
 * Default patterns to always ignore during scanning and file watching
 */
export const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.output/**',
  '**/.nitro/**',
  '**/.nuxt/**',
  '**/.graphql/**',
  '**/dist/**',
] as const

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
 * GraphQL file pattern for glob (supports both .graphql and .gql extensions)
 */
export const GRAPHQL_GLOB_PATTERN = '**/*.{graphql,gql}' as const

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

/**
 * GraphQL server framework identifiers
 */
export const GRAPHQL_FRAMEWORK_YOGA = 'graphql-yoga' as const
export const GRAPHQL_FRAMEWORK_APOLLO = 'apollo-server' as const

export type GraphQLFramework = typeof GRAPHQL_FRAMEWORK_YOGA | typeof GRAPHQL_FRAMEWORK_APOLLO

// ==================== DIRECTORY NAMES ====================

/**
 * Default directory names for GraphQL files
 */
export const DIR_SERVER_GRAPHQL = 'server/graphql' as const
export const DIR_APP_GRAPHQL = 'app/graphql' as const
export const DIR_CLIENT_GRAPHQL = 'graphql' as const

/**
 * Windows-compatible server GraphQL directory
 */
export const DIR_SERVER_GRAPHQL_WIN = 'server\\graphql' as const

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
export const FILE_SCHEMA_TS = 'schema.ts' as const
export const FILE_CONFIG_TS = 'config.ts' as const
export const FILE_CONTEXT_DTS = 'context.d.ts' as const
export const FILE_INDEX_TS = 'index.ts' as const
export const FILE_OFETCH_TS = 'ofetch.ts' as const
export const FILE_SDK_TS = 'sdk.ts' as const
export const FILE_DIRECTIVES_GRAPHQL = '_directives.graphql' as const

/**
 * Generated type definition file names
 */
export const FILE_SERVER_TYPES = 'nitro-graphql-server.d.ts' as const
export const FILE_CLIENT_TYPES = 'nitro-graphql-client.d.ts' as const

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

// ==================== LOG TAGS ====================

/**
 * Logger tag for nitro-graphql module
 */
export const LOG_TAG = 'nitro-graphql' as const
