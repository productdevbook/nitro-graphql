/**
 * Nitro module augmentation
 * Extends Nitro interfaces with GraphQL-specific properties
 */

import type { ScannedResolver } from '../../core/types/scanning'
import type { NitroGraphQLOptions } from './config'

/**
 * Immutable scan state snapshot
 * Built atomically from local scan + extend results.
 * All consumers (virtual modules, codegen, logging) read from this single snapshot.
 * Never mutate — replace the entire object for updates.
 */
export interface GraphQLScanState {
  readonly schemas: readonly string[]
  readonly resolvers: readonly ScannedResolver[]
  readonly directives: readonly ScannedResolver[]
  readonly documents: readonly string[]
  readonly directiveSchemas: string | null
  readonly extendConfigs: readonly string[]
  readonly extendSchemas: readonly string[]
}

declare module 'nitro/types' {
  interface Nitro {
    /** @deprecated Use nitro.graphql.state.schemas — kept for backward compatibility */
    scanSchemas: string[]
    /** @deprecated Use nitro.graphql.state.documents */
    scanDocuments: string[]
    /** @deprecated Use nitro.graphql.state.resolvers */
    scanResolvers: ScannedResolver[]
    /** @deprecated Use nitro.graphql.state.directives */
    scanDirectives: ScannedResolver[]

    graphql: {
      /** Immutable scan state — the single source of truth for all scanned files */
      state: GraphQLScanState
      /** Absolute path to GraphQL build directory (e.g. /project/.graphql) */
      buildDir: string
      /** Directories watched for file changes in dev mode */
      watchDirs: string[]
      /** Absolute path to client GraphQL directory (e.g. /project/graphql) */
      clientDir: string
      /** Absolute path to server GraphQL directory (e.g. /project/server/graphql) */
      serverDir: string
      /** Relative paths (from rootDir) — used for display and config resolution */
      dir: {
        build: string
        client: string
        server: string
      }
      /** @deprecated Use nitro.graphql.state.directiveSchemas */
      directiveSchemas: string | null
      /** @deprecated Use nitro.graphql.state.extendConfigs */
      extendConfigs: string[]
      /** @deprecated Use nitro.graphql.state.extendSchemas */
      extendSchemas: string[]
    }
  }
}

declare module 'nitro/types' {
  interface NitroOptions {
    graphql?: NitroGraphQLOptions
  }

  interface NitroRuntimeConfig {
    graphql?: NitroGraphQLOptions
  }

  interface NitroConfig {
    graphql?: NitroGraphQLOptions
  }
}
