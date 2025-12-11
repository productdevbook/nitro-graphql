import type { Nitro } from 'nitropack/types'
import type { NitroGraphQLOptions } from './types'
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { watch } from 'chokidar'

import consola from 'consola'
import defu from 'defu'
import { defineNitroModule } from 'nitropack/kit'
import { dirname, join, relative, resolve } from 'pathe'
import { rollupConfig } from './rollup'
import { subscribeClientTemplate } from './templates/subscribe-client'
import {
  generateDirectiveSchemas,
  generateLayerIgnorePatterns,
  getLayerAppDirectories,
  getLayerServerDirectories,
  relativeWithDot,
  scanDirectives,
  scanDocs,
  scanResolvers,
  scanSchemas,
  validateExternalServices,
} from './utils'
import { writeFileIfNotExists } from './utils/file-generator'
import {
  getDefaultPaths,
  getScaffoldConfig,
  getTypesConfig,
  resolveFilePath,
  shouldGenerateScaffold,
} from './utils/path-resolver'
import { clientTypeGeneration, serverTypeGeneration } from './utils/type-generation'

export type * from './types'

export default defineNitroModule({
  name: 'nitro-graphql',
  async setup(nitro: Nitro) {
    if (!nitro.options.graphql?.framework) {
      consola.warn('No GraphQL framework specified. Please set graphql.framework to "graphql-yoga" or "apollo-server".')
    }

    // Validate external services configuration
    if (nitro.options.graphql?.externalServices?.length) {
      const validationErrors = validateExternalServices(nitro.options.graphql.externalServices)
      if (validationErrors.length > 0) {
        consola.error('External services configuration errors:')
        for (const error of validationErrors) {
          consola.error(`  - ${error}`)
        }
        throw new Error('Invalid external services configuration')
      }
      consola.info(`Configured ${nitro.options.graphql.externalServices.length} external GraphQL services`)
    }

    nitro.graphql ||= {
      buildDir: '',
      watchDirs: [],
      clientDir: '',
      serverDir: resolve(nitro.options.srcDir, 'graphql'),
      dir: {
        build: relative(nitro.options.rootDir, nitro.options.buildDir),
        client: 'graphql',
        server: 'server',
      },
    }

    nitro.hooks.hook('rollup:before', (_, rollupConfig) => {
      rollupConfig.external = rollupConfig.external || []
      const codegenExternals = [
        'oxc-parser',
        '@oxc-parser',
      ]

      if (Array.isArray(rollupConfig.external)) {
        rollupConfig.external.push(...codegenExternals)
      }
      else if (typeof rollupConfig.external === 'function') {
        const originalExternal = rollupConfig.external
        rollupConfig.external = (id, parent, isResolved) => {
          if (codegenExternals.some(external => id.includes(external))) {
            return true
          }
          return originalExternal(id, parent, isResolved)
        }
      }
    })

    nitro.options.runtimeConfig.graphql = defu(nitro.options.runtimeConfig.graphql || {}, {
      endpoint: {
        graphql: '/api/graphql',
        healthCheck: '/api/graphql/health',
        ws: '/api/graphql/ws',
      },
      playground: true,
    } as NitroGraphQLOptions)

    // Log federation status if enabled
    if (nitro.options.graphql?.federation?.enabled) {
      consola.info(`Apollo Federation enabled for service: ${nitro.options.graphql.federation.serviceName || 'unnamed'}`)
    }

    const graphqlBuildDir = resolve(nitro.options.buildDir, 'graphql')
    nitro.graphql.buildDir = graphqlBuildDir

    const watchDirs: string[] = []

    switch (nitro.options.framework.name) {
      case 'nuxt': {
        // For Nuxt, set clientDir to app/graphql if not already configured
        if (!nitro.graphql.clientDir) {
          nitro.graphql.clientDir = resolve(nitro.options.rootDir, 'app', 'graphql')
          nitro.graphql.dir.client = 'app/graphql'
        }

        // For Nuxt, ensure serverDir points to server/graphql if using default srcDir
        if (!nitro.options.graphql?.serverDir) {
          nitro.graphql.serverDir = resolve(nitro.options.rootDir, 'server', 'graphql')
        }
        watchDirs.push(nitro.graphql.clientDir)

        // Add layer directories to watch list
        const layerServerDirs = getLayerServerDirectories(nitro)
        const layerAppDirs = getLayerAppDirectories(nitro)

        // Add server GraphQL directories from layers
        for (const layerServerDir of layerServerDirs) {
          watchDirs.push(join(layerServerDir, 'graphql'))
        }

        // Add client GraphQL directories from layers (using app directories)
        for (const layerAppDir of layerAppDirs) {
          watchDirs.push(join(layerAppDir, 'graphql'))
        }
        break
      }
      case 'nitro':
        nitro.graphql.clientDir = resolve(nitro.options.rootDir, 'graphql')
        nitro.graphql.dir.client = 'graphql'
        break
      default:
    }

    // Add external service document patterns to watch
    if (nitro.options.graphql?.externalServices?.length) {
      for (const service of nitro.options.graphql.externalServices) {
        if (service.documents?.length) {
          for (const pattern of service.documents) {
            if (!pattern)
              continue
            // Extract directory from pattern for watching
            const baseDir = pattern.split('**')[0]?.replace(/\/$/, '') || '.'
            const resolvedDir = resolve(nitro.options.rootDir, baseDir)
            if (!watchDirs.includes(resolvedDir)) {
              watchDirs.push(resolvedDir)
            }
          }
        }
      }
    }

    const watcher = watch(watchDirs, {
      persistent: true,
      ignoreInitial: true,
      ignored: [
        ...nitro.options.ignore,
        ...generateLayerIgnorePatterns(nitro), // Ignore auto-generated files in all layers
      ],
    }).on('all', async (_, path) => {
      if (path.endsWith('.graphql') || path.endsWith('.gql')) {
        await clientTypeGeneration(nitro)
      }
    })

    nitro.hooks.hook('close', () => {
      watcher.close()
    })

    const tsConfigPath = resolve(
      nitro.options.buildDir,
      nitro.options.typescript.tsconfigPath,
    )
    const tsconfigDir = dirname(tsConfigPath)

    const schemas = await scanSchemas(nitro)
    nitro.scanSchemas = schemas

    const docs = await scanDocs(nitro)
    nitro.scanDocuments = docs

    const resolvers = await scanResolvers(nitro)
    nitro.scanResolvers = resolvers

    const directives = await scanDirectives(nitro)
    nitro.scanDirectives = directives

    // Generate directive schemas file using clean parser
    await generateDirectiveSchemas(nitro, directives)

    nitro.hooks.hook('dev:start', async () => {
      const schemas = await scanSchemas(nitro)
      nitro.scanSchemas = schemas

      const resolvers = await scanResolvers(nitro)
      nitro.scanResolvers = resolvers

      const directives = await scanDirectives(nitro)
      nitro.scanDirectives = directives

      // Regenerate directive schemas using clean parser
      await generateDirectiveSchemas(nitro, directives)

      const docs = await scanDocs(nitro)
      nitro.scanDocuments = docs

      // Validate resolver setup and provide helpful diagnostics (only in dev)
      if (nitro.options.dev) {
        consola.box({
          title: 'Nitro GraphQL',
          message: [
            `Framework: ${nitro.options.graphql?.framework || 'Not configured'}`,
            `Schemas: ${schemas.length}`,
            `Resolvers: ${resolvers.length}`,
            `Directives: ${directives.length}`,
            `Documents: ${docs.length}`,
            '',
            'Debug Dashboard: /_nitro/graphql/debug',
          ].join('\n'),
          style: {
            borderColor: 'cyan',
            borderStyle: 'rounded',
          },
        })

        if (resolvers.length > 0) {
          const totalExports = resolvers.reduce((sum, r) => sum + r.imports.length, 0)

          // Show breakdown by type for better visibility
          const typeCount = {
            query: 0,
            mutation: 0,
            resolver: 0,
            type: 0,
            subscription: 0,
            directive: 0,
          }
          for (const resolver of resolvers) {
            for (const imp of resolver.imports) {
              if (imp.type in typeCount) {
                typeCount[imp.type as keyof typeof typeCount]++
              }
            }
          }

          const breakdown: string[] = []
          if (typeCount.query > 0)
            breakdown.push(`${typeCount.query} query`)
          if (typeCount.mutation > 0)
            breakdown.push(`${typeCount.mutation} mutation`)
          if (typeCount.resolver > 0)
            breakdown.push(`${typeCount.resolver} resolver`)
          if (typeCount.type > 0)
            breakdown.push(`${typeCount.type} type`)
          if (typeCount.subscription > 0)
            breakdown.push(`${typeCount.subscription} subscription`)
          if (typeCount.directive > 0)
            breakdown.push(`${typeCount.directive} directive`)

          if (breakdown.length > 0) {
            consola.success(`[nitro-graphql] ${totalExports} resolver export(s): ${breakdown.join(', ')}`)
          }
        }
        else {
          consola.warn('[nitro-graphql] No resolvers found. Check /_nitro/graphql/debug for details.')
        }
      }
    })

    await rollupConfig(nitro)

    // Generate server and client types
    await serverTypeGeneration(nitro)
    await clientTypeGeneration(nitro)

    nitro.hooks.hook('close', async () => {
      await serverTypeGeneration(nitro)
      await clientTypeGeneration(nitro)
    })

    const runtime = fileURLToPath(
      new URL('routes', import.meta.url),
    )
    // Main GraphQL endpoint
    const methods = ['get', 'post', 'options'] as const
    if (nitro.options.graphql?.framework === 'graphql-yoga') {
      // Register the GraphQL Yoga handler for all methods
      for (const method of methods) {
        nitro.options.handlers.push({
          route: nitro.options.runtimeConfig.graphql?.endpoint?.graphql || '/api/graphql',
          handler: join(runtime, 'graphql-yoga'),
          method,
        })
      }
    }

    if (nitro.options.graphql?.framework === 'apollo-server') {
      // Register the Apollo Server handler for all methods
      for (const method of methods) {
        nitro.options.handlers.push({
          route: nitro.options.runtimeConfig.graphql?.endpoint?.graphql || '/api/graphql',
          handler: join(runtime, 'apollo-server'),
          method,
        })
      }
    }

    // Health check endpoint
    nitro.options.handlers.push({
      route: nitro.options.runtimeConfig.graphql?.endpoint?.healthCheck || '/api/graphql/health',
      handler: join(runtime, 'health'),
      method: 'get',
    })

    // WebSocket subscription endpoint (if enabled)
    if (nitro.options.graphql?.subscriptions?.enabled) {
      // Enable experimental websocket feature for Nitro v2
      nitro.options.experimental ||= {}
      nitro.options.experimental.websocket = true

      const wsEndpoint = nitro.options.runtimeConfig.graphql?.endpoint?.ws
        || nitro.options.graphql?.subscriptions?.endpoint
        || '/api/graphql/ws'

      if (nitro.options.graphql?.framework === 'graphql-yoga') {
        nitro.options.handlers.push({
          route: wsEndpoint,
          handler: join(runtime, 'graphql-yoga-ws'),
        })
      }

      if (nitro.options.graphql?.framework === 'apollo-server') {
        nitro.options.handlers.push({
          route: wsEndpoint,
          handler: join(runtime, 'apollo-server-ws'),
        })
      }

      consola.info(`[nitro-graphql] WebSocket subscriptions enabled at: ${wsEndpoint}`)
    }

    // Debug endpoint (development only)
    if (nitro.options.dev) {
      nitro.options.handlers.push({
        route: '/_nitro/graphql/debug',
        handler: join(runtime, 'debug'),
        method: 'get',
      })
      consola.info('[nitro-graphql] Debug dashboard available at: /_nitro/graphql/debug')
    }

    // Auto-import utilities
    if (nitro.options.imports) {
      nitro.options.imports.presets ??= []
      nitro.options.imports.presets.push({
        from: fileURLToPath(new URL('utils/define', import.meta.url)),
        imports: [
          'defineResolver',
          'defineMutation',
          'defineQuery',
          'defineSubscription',
          'defineType',
          'defineField',
          'defineGraphQLConfig',
          'defineSchema',
          'defineDirective',
        ],
      })
    }

    // Access the internal rollup config and add our prefix
    nitro.hooks.hook('rollup:before', (_, rollupConfig) => {
      const manualChunks = rollupConfig.output?.manualChunks
      const chunkFiles = rollupConfig.output?.chunkFileNames

      if (!rollupConfig.output.inlineDynamicImports) {
        rollupConfig.output.manualChunks = (id, meta) => {
          if (id.endsWith('.graphql') || id.endsWith('.gql')) {
            return 'schemas'
          }

          // resolsvers and schemas are not in the same directory, so we need to check both
          if (id.endsWith('.resolver.ts')) {
            return 'resolvers'
          }

          if (typeof manualChunks === 'function') {
            return manualChunks(id, meta)
          }
          // If manualChunks is not a function, do not call it
          return undefined
        }
      }

      rollupConfig.output.chunkFileNames = (chunkInfo) => {
        // Check for GraphQL files
        if (chunkInfo.moduleIds && chunkInfo.moduleIds.some(id =>
          id.endsWith('.graphql') || id.endsWith('.resolver.ts') || id.endsWith('.gql'),
        )) {
          return `chunks/graphql/[name].mjs`
        }

        // Use original logic for other chunks
        if (typeof chunkFiles === 'function') {
          return chunkFiles(chunkInfo)
        }

        // Unknown path
        return `chunks/_/[name].mjs`
      }
    })

    nitro.options.typescript.strict = true

    nitro.hooks.hook('types:extend', (types) => {
      // Add TypeScript path alias for IDE support
      types.tsConfig ||= {}
      types.tsConfig.compilerOptions ??= {}
      types.tsConfig.compilerOptions.paths ??= {}

      // Resolve paths using the same logic as type generation
      const placeholders = getDefaultPaths(nitro)
      const typesConfig = getTypesConfig(nitro)

      // Resolve server types path
      const serverTypesPath = resolveFilePath(
        typesConfig.server,
        typesConfig.enabled,
        true,
        '{typesDir}/nitro-graphql-server.d.ts',
        placeholders,
      )
      if (serverTypesPath) {
        types.tsConfig.compilerOptions.paths['#graphql/server'] = [
          relativeWithDot(tsconfigDir, serverTypesPath),
        ]
      }

      // Resolve client types path
      const clientTypesPath = resolveFilePath(
        typesConfig.client,
        typesConfig.enabled,
        true,
        '{typesDir}/nitro-graphql-client.d.ts',
        placeholders,
      )
      if (clientTypesPath) {
        types.tsConfig.compilerOptions.paths['#graphql/client'] = [
          relativeWithDot(tsconfigDir, clientTypesPath),
        ]
      }

      // Schema path (always uses serverDir)
      types.tsConfig.compilerOptions.paths['#graphql/schema'] = [
        relativeWithDot(tsconfigDir, join(nitro.graphql.serverDir, 'schema.ts')),
      ]

      // Add path mappings for external services
      if (nitro.options.graphql?.externalServices?.length) {
        for (const service of nitro.options.graphql.externalServices) {
          const servicePlaceholders = {
            ...placeholders,
            serviceName: service.name,
          }

          // Resolve external service types path with service-specific override
          const externalTypesPath = resolveFilePath(
            service.paths?.types ?? typesConfig.external,
            typesConfig.enabled,
            true,
            '{typesDir}/nitro-graphql-client-{serviceName}.d.ts',
            servicePlaceholders,
          )

          if (externalTypesPath) {
            types.tsConfig.compilerOptions.paths[`#graphql/client/${service.name}`] = [
              relativeWithDot(tsconfigDir, externalTypesPath),
            ]
          }
        }
      }

      types.tsConfig.include = types.tsConfig.include || []

      // Add resolved type files to include
      if (serverTypesPath) {
        types.tsConfig.include.push(relativeWithDot(tsconfigDir, serverTypesPath))
      }
      if (clientTypesPath) {
        types.tsConfig.include.push(relativeWithDot(tsconfigDir, clientTypesPath))
      }
      // Always include graphql.d.ts from default location
      types.tsConfig.include.push(
        relativeWithDot(tsconfigDir, join(placeholders.typesDir, 'graphql.d.ts')),
      )

      // Add external service type files to include
      if (nitro.options.graphql?.externalServices?.length) {
        for (const service of nitro.options.graphql.externalServices) {
          const servicePlaceholders = {
            ...placeholders,
            serviceName: service.name,
          }

          const externalTypesPath = resolveFilePath(
            service.paths?.types ?? typesConfig.external,
            typesConfig.enabled,
            true,
            '{typesDir}/nitro-graphql-client-{serviceName}.d.ts',
            servicePlaceholders,
          )

          if (externalTypesPath) {
            types.tsConfig.include.push(relativeWithDot(tsconfigDir, externalTypesPath))
          }
        }
      }
    })

    // Store external services info for Nuxt module
    if (nitro.options.framework?.name === 'nuxt' && nitro.options.graphql?.externalServices?.length) {
      // Add external services to Nuxt context so the Nuxt module can access them
      nitro.hooks.hook('build:before', () => {
        const nuxtOptions = (nitro as { _nuxt?: { options?: any } })._nuxt?.options
        if (nuxtOptions) {
          nuxtOptions.nitroGraphqlExternalServices = nitro.options.graphql?.externalServices || []
        }
      })
    }

    // ==================== SCAFFOLD FILE GENERATION ====================
    // Generate scaffold files based on configuration
    // Can be disabled via: scaffold: false or scaffold.enabled: false

    if (shouldGenerateScaffold(nitro)) {
      const placeholders = getDefaultPaths(nitro)
      const scaffoldConfig = getScaffoldConfig(nitro)

      // 1. graphql.config.ts - GraphQL Config for IDE tooling
      const graphqlConfigPath = resolveFilePath(
        scaffoldConfig.graphqlConfig,
        scaffoldConfig.enabled,
        true,
        'graphql.config.ts',
        placeholders,
      )

      if (graphqlConfigPath) {
        const schemaPath = relativeWithDot(nitro.options.rootDir, resolve(nitro.graphql.buildDir, 'schema.graphql'))
        const documentsPath = relativeWithDot(nitro.options.rootDir, resolve(nitro.graphql.clientDir, '**/*.{graphql,js,ts,jsx,tsx}'))

        writeFileIfNotExists(graphqlConfigPath, `
import type { IGraphQLConfig } from 'graphql-config'

export default <IGraphQLConfig> {
    projects: {
      default: {
        schema: [
          '${schemaPath}',
        ],
        documents: [
          '${documentsPath}',
        ],
      },
    },
}`, 'graphql.config.ts')
      }

      // Ensure server GraphQL directory exists if any server files will be generated
      const serverSchemaPath = resolveFilePath(
        scaffoldConfig.serverSchema,
        scaffoldConfig.enabled,
        true,
        '{serverGraphql}/schema.ts',
        placeholders,
      )
      const serverConfigPath = resolveFilePath(
        scaffoldConfig.serverConfig,
        scaffoldConfig.enabled,
        true,
        '{serverGraphql}/config.ts',
        placeholders,
      )
      const serverContextPath = resolveFilePath(
        scaffoldConfig.serverContext,
        scaffoldConfig.enabled,
        true,
        '{serverGraphql}/context.ts',
        placeholders,
      )

      // Create server directory if any server scaffold files will be generated
      if (serverSchemaPath || serverConfigPath || serverContextPath) {
        if (!existsSync(nitro.graphql.serverDir)) {
          mkdirSync(nitro.graphql.serverDir, { recursive: true })
        }
      }

      // 2. server/graphql/schema.ts - Schema definition file
      if (serverSchemaPath) {
        writeFileIfNotExists(serverSchemaPath, `export default defineSchema({

})
`, 'server schema.ts')
      }

      // 3. server/graphql/config.ts - GraphQL server configuration
      if (serverConfigPath) {
        writeFileIfNotExists(serverConfigPath, `// Example GraphQL config file please change it to your needs
// import * as tables from '../drizzle/schema/index'
// import { useDatabase } from '../utils/useDb'

export default defineGraphQLConfig({
// graphql-yoga example config
// context: () => {
//   return {
//     context: {
//       useDatabase,
//       tables,
//     },
//   }
// },
})
`, 'server config.ts')
      }

      // 4. server/graphql/context.ts - H3 context augmentation
      if (serverContextPath) {
        writeFileIfNotExists(serverContextPath, `// Example context definition - please change it to your needs
// import type { Database } from '../utils/useDb'

declare module 'h3' {
  interface H3EventContext {
    // Add your custom context properties here
    // useDatabase: () => Database
    // tables: typeof import('../drizzle/schema')
    // auth?: {
    //   user?: {
    //     id: string
    //     role: 'admin' | 'user'
    //   }
    // }
  }
}`, 'server context.ts')
      }

      // Check for old context.d.ts file and warn users to migrate
      if (existsSync(join(nitro.graphql.serverDir, 'context.d.ts'))) {
        consola.warn('nitro-graphql: Found context.d.ts file. Please rename it to context.ts for the new structure.')
        consola.info('The context file should now be context.ts instead of context.d.ts')
      }

      // 5. graphql/subscribe.ts - Subscription client (if subscriptions are enabled)
      if (nitro.options.graphql?.subscriptions?.enabled) {
        // Ensure client directory exists
        if (!existsSync(nitro.graphql.clientDir)) {
          mkdirSync(nitro.graphql.clientDir, { recursive: true })
        }

        // Generate subscribe.ts in the client directory (e.g., graphql/default/subscribe.ts)
        const defaultDir = resolve(nitro.graphql.clientDir, 'default')
        if (!existsSync(defaultDir)) {
          mkdirSync(defaultDir, { recursive: true })
        }

        const subscribeClientPath = resolve(defaultDir, 'subscribe.ts')
        writeFileIfNotExists(subscribeClientPath, subscribeClientTemplate, 'subscribe.ts')
      }
    }
    else {
      consola.info('[nitro-graphql] Scaffold file generation is disabled (library mode)')
    }
  },
})
