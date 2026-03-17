/**
 * Nitro module augmentation
 * Extends Nitro interfaces with GraphQL-specific properties
 */

import type { GenImport } from './config'
import type { NitroGraphQLOptions } from './config'

/**
 * Immutable scan state snapshot
 * Built atomically from local scan + extend results.
 * All consumers (virtual modules, codegen, logging) read from this single snapshot.
 * Never mutate — replace the entire object for updates.
 */
export interface GraphQLScanState {
  readonly schemas: readonly string[]
  readonly resolvers: readonly GenImport[]
  readonly directives: readonly GenImport[]
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
    scanResolvers: GenImport[]
    /** @deprecated Use nitro.graphql.state.directives */
    scanDirectives: GenImport[]

    graphql: {
      /** Immutable scan state — the single source of truth for all scanned files */
      state: GraphQLScanState
      buildDir: string
      watchDirs: string[]
      clientDir: string
      serverDir: string
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
