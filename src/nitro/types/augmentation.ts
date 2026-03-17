/**
 * Nitro module augmentation
 * Extends Nitro interfaces with GraphQL-specific properties
 */

import type { GenImport } from './config'
import type { NitroGraphQLOptions } from './config'

declare module 'nitro/types' {
  interface Nitro {
    scanSchemas: string[]
    scanDocuments: string[]
    scanResolvers: GenImport[]
    scanDirectives: GenImport[]
    graphql: {
      buildDir: string
      watchDirs: string[]
      clientDir: string
      serverDir: string
      dir: {
        build: string
        client: string
        server: string
      }
      /** Inline directive schemas generated from .directive.ts files */
      directiveSchemas: string | null
      /** Resolved extend paths from manifests (populated during setup) */
      resolvedExtend?: {
        schemas: string[]
        resolvers: string[]
        directives: string[]
      }
      /** Config paths from extend packages (for merging) */
      extendConfigs: string[]
      /** Schema.ts paths from extend packages (for merging) */
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
