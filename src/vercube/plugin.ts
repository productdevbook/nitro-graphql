/**
 * Vercube GraphQL Plugin
 *
 * Extends Vercube's BasePlugin to integrate nitro-graphql.
 */

import type { App } from '@vercube/core'
import type { Container } from '@vercube/di'
import type { CoreServerInstance, ResolverDefinition, ScanContext, SchemaDefinition } from '../core/runtime'
import type { NitroGraphQLOptions } from '../nitro/types'
import type { ResolverMetadata } from './types'
import { readFileSync } from 'node:fs'
import { BasePlugin } from '@vercube/core'
// Import from runtime module to avoid bundling codegen dependencies
import {
  createSandboxResponse,
  createSilentLogger,
  createYogaServer,
  scanSchemasCore,
} from '../core/runtime'
import { resolverClasses } from './decorators'

// DI token for GraphQLPlugin injection (avoids bundler class renaming issues)
export const GRAPHQL_PLUGIN = Symbol.for('nitro-graphql:GraphQLPlugin')

// BASE_SCHEMA for extend type support
const BASE_SCHEMA: SchemaDefinition = {
  def: `type Query { _empty: String }
type Mutation { _empty: String }`,
}

interface ResolverClass {
  new (): any
  prototype: any
  __graphql_resolvers?: ResolverMetadata[]
}

/**
 * GraphQL Plugin for Vercube
 *
 * @example
 * ```typescript
 * import { GraphQLPlugin } from 'nitro-graphql/vercube'
 *
 * app.addPlugin(GraphQLPlugin, {
 *   serverDir: './server/graphql',
 *   security: { playground: true },
 * })
 * ```
 */
export class GraphQLPlugin extends BasePlugin<NitroGraphQLOptions> {
  override name = 'graphql'

  private server: CoreServerInstance | null = null
  // eslint-disable-next-line ts/no-unsafe-function-type -- Generic class reference
  private resolverInstances = new Map<Function, unknown>()

  override async use(app: App, options: NitroGraphQLOptions = {}): Promise<void> {
    // Build resolver map from decorated classes using Vercube's container
    const resolverMap = this.buildResolverMap(app.container)
    const resolvers: ResolverDefinition[] = [{ resolver: resolverMap }]
    const schemas: SchemaDefinition[] = [BASE_SCHEMA]
    let scannedFiles: string[] = []

    // Scan .graphql files from serverDir
    if (options.serverDir) {
      // Get root from app config or options or cwd
      const rootDir = options.rootDir || (app.config.build?.root) || process.cwd()

      const scanCtx: ScanContext = {
        rootDir,
        serverDir: options.serverDir,
        clientDir: options.clientDir || '',
        ignorePatterns: options.ignore || ['**/node_modules/**', '**/dist/**'],
        isDev: app.config.dev ?? true,
        logger: createSilentLogger(),
      }

      const scanResult = await scanSchemasCore(scanCtx)
      scannedFiles = scanResult.items

      // eslint-disable-next-line no-console
      console.log('[GraphQL] Scanned schemas:', scannedFiles)

      for (const filePath of scannedFiles) {
        const content = readFileSync(filePath, 'utf-8')
        schemas.push({ def: content })
      }

      // Note: Type generation is not done at runtime
      // Use nitro-graphql CLI or a separate build step for type generation
    }

    // Add inline typedefs
    if (options.typedefs) {
      for (const typedef of options.typedefs) {
        schemas.push({ def: typedef })
      }
    }

    const endpoint = typeof options.endpoint === 'string'
      ? options.endpoint
      : options.endpoint?.graphql || '/api/graphql'

    // eslint-disable-next-line no-console
    console.log('[GraphQL] Creating server with', schemas.length, 'schemas and', Object.keys(resolverMap).length, 'resolver types')

    this.server = await createYogaServer({
      schemas,
      resolvers,
      directives: [],
      moduleConfig: {
        federation: options.federation,
      },
      endpoint,
      security: options.security,
    })

    // Store plugin instance in container for controller access (use token to avoid bundler issues)
    app.container.bindInstance(GRAPHQL_PLUGIN, this)
  }

  /**
   * Build resolver map from decorated classes using Vercube's DI container
   */
  private buildResolverMap(container: Container): Record<string, Record<string, any>> {
    const resolvers: Record<string, Record<string, any>> = {}

    for (const ResolverClass of resolverClasses as Set<ResolverClass>) {
      // Get instance from Vercube's DI container (use getOptional to avoid exceptions)
      let instance = container.getOptional(ResolverClass)
      if (!instance) {
        // If not in container, create new instance
        instance = new ResolverClass()
      }

      this.resolverInstances.set(ResolverClass, instance)

      const metadata = ResolverClass.__graphql_resolvers || []

      for (const resolver of metadata) {
        const { type, field, propertyName } = resolver

        if (!resolvers[type]) {
          resolvers[type] = {}
        }

        // Standard GraphQL resolver signature: (parent, args, context, info)
        resolvers[type][field] = (parent: any, args: any, context: any, info: any) => {
          return instance[propertyName](parent, args, context, info)
        }
      }
    }

    return resolvers
  }

  /**
   * Handle GraphQL request
   * @param request - The incoming Request object
   * @param context - Optional context to pass to resolvers (e.g., { request, container })
   */
  async handleRequest(request: Request, context?: Record<string, unknown>): Promise<Response> {
    if (!this.server) {
      return new Response('GraphQL not initialized', { status: 500 })
    }
    return this.server.fetch(request, context)
  }

  /**
   * Handle sandbox script request
   */
  async handleSandboxScript(): Promise<Response> {
    return createSandboxResponse()
  }
}
