/**
 * Vercube GraphQL Adapter
 *
 * Uses nitro-graphql core for:
 * - Schema scanning (scanSchemasCore)
 * - Server creation (createYogaServer)
 * - Sandbox (createSandboxResponse)
 *
 * Note: Type generation is not included to avoid bundling Node.js-only dependencies.
 * Use nitro-graphql CLI for type generation.
 */

import type { CoreServerInstance, ResolverDefinition, ScanContext, SchemaDefinition } from '../core/runtime'
import type { NitroGraphQLOptions } from '../nitro/types'
import type { ParamMetadata, ResolverMetadata } from './types'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
// Import from runtime module to avoid bundling codegen dependencies
import {
  createSandboxResponse,
  createSilentLogger,
  createYogaServer,
  scanSchemasCore,
} from '../core/runtime'
import { resolverClasses } from './decorators'

// BASE_SCHEMA for extend type support
const BASE_SCHEMA: SchemaDefinition = {
  def: `type Query { _empty: String }
type Mutation { _empty: String }`,
}

interface ResolverClass {
  new (): any
  prototype: any
  __graphql_resolvers?: ResolverMetadata[]
  __graphql_params?: Map<string, ParamMetadata[]>
}

/**
 * Vercube GraphQL Adapter
 *
 * @example
 * ```typescript
 * import { VercubeGraphQLAdapter, Resolver, Query } from 'nitro-graphql/vercube'
 *
 * @Resolver()
 * class HelloResolver {
 *   @Query('hello')
 *   getHello() {
 *     return 'Hello!'
 *   }
 * }
 *
 * const adapter = new VercubeGraphQLAdapter()
 * await adapter.initialize({
 *   serverDir: './server/graphql',
 * })
 *
 * // In your route handler:
 * return adapter.handleRequest(request)
 * ```
 */
// eslint-disable-next-line ts/no-unsafe-function-type -- Generic class reference
type AnyClass = Function

export class VercubeGraphQLAdapter {
  private server: CoreServerInstance | null = null
  private resolverInstances = new Map<AnyClass, unknown>()

  /**
   * Register a resolver instance (for DI integration)
   */
  registerResolver(ResolverClass: AnyClass, instance: unknown): void {
    this.resolverInstances.set(ResolverClass, instance)
  }

  /**
   * Build resolver map from decorated classes
   */
  buildResolverMap(): Record<string, Record<string, any>> {
    const resolvers: Record<string, Record<string, any>> = {}

    for (const ResolverClass of resolverClasses as Set<ResolverClass>) {
      // Get or create instance
      let instance = this.resolverInstances.get(ResolverClass)
      if (!instance) {
        instance = new ResolverClass()
        this.resolverInstances.set(ResolverClass, instance)
      }

      const metadata = ResolverClass.__graphql_resolvers || []
      const paramsMap = ResolverClass.__graphql_params || new Map()

      for (const resolver of metadata) {
        const { type, field, propertyName } = resolver
        const params = paramsMap.get(propertyName) || []

        if (!resolvers[type]) {
          resolvers[type] = {}
        }

        resolvers[type][field] = this.createResolver(instance, propertyName, params)
      }
    }

    return resolvers
  }

  private createResolver(
    instance: any,
    methodName: string,
    paramsMeta: ParamMetadata[],
  ) {
    return async (parent: any, args: any, context: any, info: any) => {
      const sortedParams = [...paramsMeta].sort((a, b) => a.index - b.index)
      const resolvedParams: any[] = []

      for (const param of sortedParams) {
        switch (param.type) {
          case 'parent':
            resolvedParams[param.index] = parent
            break
          case 'arg':
            resolvedParams[param.index] = param.name ? args[param.name] : args
            break
          case 'context':
            resolvedParams[param.index] = context
            break
          case 'info':
            resolvedParams[param.index] = info
            break
        }
      }

      return instance[methodName](...resolvedParams)
    }
  }

  /**
   * Initialize the GraphQL server
   */
  async initialize(options: NitroGraphQLOptions): Promise<void> {
    const resolverMap = this.buildResolverMap()
    const resolvers: ResolverDefinition[] = [{ resolver: resolverMap }]
    const schemas: SchemaDefinition[] = [BASE_SCHEMA]
    let scannedFiles: string[] = []

    // Scan .graphql files from serverDir
    if (options.serverDir) {
      const rootDir = options.rootDir || process.cwd()

      const scanCtx: ScanContext = {
        rootDir,
        serverDir: options.serverDir,
        clientDir: options.clientDir || '',
        ignorePatterns: options.ignore || ['**/node_modules/**', '**/dist/**'],
        isDev: true,
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

      // Generate TypeScript types
      if (scannedFiles.length > 0) {
        const typesDir = options.typesDir || resolve(rootDir, '.vercube/graphql')
        const typesPath = resolve(typesDir, 'types.ts')
        await this.generateTypes(scannedFiles, typesPath)
      }
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
  }

  /**
   * Handle GraphQL request
   */
  async handleRequest(request: Request): Promise<Response> {
    if (!this.server) {
      return new Response('GraphQL not initialized', { status: 500 })
    }
    return this.server.fetch(request)
  }

  /**
   * Handle sandbox script request
   */
  async handleSandboxScript(): Promise<Response> {
    return createSandboxResponse()
  }
}
