import type { Nitro } from 'nitro/types'
import type { NitroGraphQLOptions } from './types'
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { watch } from 'chokidar'
import consola from 'consola'

import defu from 'defu'
import { dirname, join, relative, resolve } from 'pathe'
import { rollupConfig } from './rollup'
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
  getScaffoldConfig,
  getTypesConfig,
  resolveFilePath,
  shouldGenerateScaffold,
} from './utils/path-resolver'
import { clientTypeGeneration, serverTypeGeneration } from './utils/type-generation'

const logger = consola.withTag('nitro-graphql')

/**
 * Shared setup logic for nitro-graphql module
 * Used by both the direct Nitro module export and the Vite plugin's nitro: hook
 */
export async function setupNitroGraphQL(nitro: Nitro) {
  nitro.options.graphql ||= {}
  nitro.options.graphql.types = defu(nitro.options.graphql.types, {
    server: '.graphql/nitro-graphql-server.d.ts',
    client: '.graphql/nitro-graphql-client.d.ts',
    enabled: true,
  })

  if (!nitro.options.graphql?.framework) {
    logger.warn('No GraphQL framework specified. Please set graphql.framework to "graphql-yoga" or "apollo-server".')
  }

  // Validate external services configuration
  if (nitro.options.graphql?.externalServices?.length) {
    const validationErrors = validateExternalServices(nitro.options.graphql.externalServices)
    if (validationErrors.length > 0) {
      logger.error('External services configuration errors:')
      for (const error of validationErrors) {
        logger.error(`  - ${error}`)
      }
      throw new Error('Invalid external services configuration')
    }
    logger.info(`Configured ${nitro.options.graphql.externalServices.length} external GraphQL services`)
  }

  // Get default paths from path resolver
  const { getDefaultPaths } = await import('./utils/path-resolver')
  const defaultPaths = getDefaultPaths(nitro)

  nitro.graphql ||= {
    buildDir: '',
    watchDirs: [],
    clientDir: defaultPaths.clientGraphql,
    serverDir: defaultPaths.serverGraphql,
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

    const allExternals = [...codegenExternals]

    // Apollo Federation is optional - only mark as external if NOT enabled
    // (if enabled, it will be bundled; if not, it won't be imported at all)
    if (!nitro.options.graphql?.federation?.enabled) {
      const federationExternals = [
        '@apollo/subgraph',
        '@apollo/federation-internals',
        '@apollo/cache-control-types',
      ]
      allExternals.push(...federationExternals)
    }

    if (Array.isArray(rollupConfig.external)) {
      rollupConfig.external.push(...allExternals)
    }
    else if (typeof rollupConfig.external === 'function') {
      const originalExternal = rollupConfig.external
      rollupConfig.external = (id, parent, isResolved) => {
        if (allExternals.some(external => id.includes(external))) {
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
    },
    playground: true,
  } as NitroGraphQLOptions)

  // Log federation status if enabled
  if (nitro.options.graphql?.federation?.enabled) {
    logger.info(`Apollo Federation enabled for service: ${nitro.options.graphql.federation.serviceName || 'unnamed'}`)
  }

  const graphqlBuildDir = resolve(nitro.options.buildDir, 'graphql')
  nitro.graphql.buildDir = graphqlBuildDir

  const watchDirs: string[] = []

  switch (nitro.options.framework.name) {
    case 'nuxt': {
      // Update relative dir paths for Nuxt
      nitro.graphql.dir.client = relative(nitro.options.rootDir, nitro.graphql.clientDir)
      nitro.graphql.dir.server = relative(nitro.options.rootDir, nitro.graphql.serverDir)

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
      // Update relative dir paths for Nitro
      nitro.graphql.dir.client = relative(nitro.options.rootDir, nitro.graphql.clientDir)
      nitro.graphql.dir.server = relative(nitro.options.rootDir, nitro.graphql.serverDir)

      // Watch both client and server directories
      watchDirs.push(nitro.graphql.clientDir)
      watchDirs.push(nitro.graphql.serverDir)
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
      ...generateLayerIgnorePatterns(), // Ignore auto-generated files in all layers
    ],
  }).on('all', async (_, path) => {
    const isGraphQLFile = path.endsWith('.graphql') || path.endsWith('.gql')
    const isResolverFile = path.endsWith('.resolver.ts') || path.endsWith('.resolver.js')
    const isDirectiveFile = path.endsWith('.directive.ts') || path.endsWith('.directive.js')

    if (isGraphQLFile || isResolverFile || isDirectiveFile) {
      // Determine if this is a server or client file
      const isServerFile = path.includes(nitro.graphql.serverDir)
        || path.includes('server/graphql')
        || path.includes('server\\graphql')

      if (isServerFile || isResolverFile || isDirectiveFile) {
        // Server GraphQL/resolver/directive file changed - rescan and reload
        await scanResolvers(nitro).then(r => nitro.scanResolvers = r)
        await scanDirectives(nitro).then(d => nitro.scanDirectives = d)
        logger.success('Types regenerated')
        await serverTypeGeneration(nitro, { silent: true })
        await clientTypeGeneration(nitro, { silent: true })
        // Trigger Nitro reload to pick up changes
        await nitro.hooks.callHook('dev:reload')
      }
      else {
        // Client GraphQL file changed - only regenerate client types
        logger.success('Types regenerated')
        await clientTypeGeneration(nitro, { silent: true })
      }
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

  // Track if we've already shown initial logs to prevent duplicates
  let hasShownInitialLogs = false

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
    // Only show once during startup to avoid duplicate logs
    if (nitro.options.dev && !hasShownInitialLogs) {
      hasShownInitialLogs = true

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
          logger.success(`${totalExports} resolver export(s): ${breakdown.join(', ')}`)
        }
      }
      else {
        logger.warn('No resolvers found. Check /_nitro/graphql/debug for details.')
      }
    }
  })

  await rollupConfig(nitro)

  // Generate server and client types (initial generation with logs)
  await serverTypeGeneration(nitro)
  await clientTypeGeneration(nitro, { isInitial: true })

  nitro.hooks.hook('close', async () => {
    await serverTypeGeneration(nitro, { silent: true })
    await clientTypeGeneration(nitro, { silent: true })
  })

  const runtime = fileURLToPath(
    new URL('routes', import.meta.url),
  )
  // Main GraphQL endpoint
  const methods = ['GET', 'POST', 'OPTIONS'] as const
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
    method: 'GET',
  })

  // Debug endpoint (development only)
  if (nitro.options.dev) {
    nitro.options.handlers.push({
      route: '/_nitro/graphql/debug',
      handler: join(runtime, 'debug'),
      method: 'GET',
    })
  }

  // Access the internal rollup config and add our prefix
  nitro.hooks.hook('rollup:before', (_, rollupConfig) => {
    const manualChunks = rollupConfig.output?.manualChunks
    const chunkFiles = rollupConfig.output?.chunkFileNames

    if (!rollupConfig.output.inlineDynamicImports) {
      // manualChunks for Rollup
      rollupConfig.output.manualChunks = (id, meta) => {
        // Handle schema files (.graphql, .gql)
        if (id.endsWith('.graphql') || id.endsWith('.gql')) {
          let graphqlIndex = id.indexOf('server/graphql/')
          let baseLength = 'server/graphql/'.length

          if (graphqlIndex === -1) {
            graphqlIndex = id.indexOf('routes/graphql/')
            baseLength = 'routes/graphql/'.length
          }

          if (graphqlIndex !== -1) {
            const relativePath = id.slice(graphqlIndex + baseLength)
            // Remove .graphql or .gql extension and add -schema suffix
            const chunkName = relativePath.replace(/\.(?:graphql|gql)$/, '-schema')
            return chunkName
          }
          return 'schemas'
        }

        // Handle resolver files (.resolver.ts)
        if (id.endsWith('.resolver.ts')) {
          let graphqlIndex = id.indexOf('server/graphql/')
          let baseLength = 'server/graphql/'.length

          if (graphqlIndex === -1) {
            graphqlIndex = id.indexOf('routes/graphql/')
            baseLength = 'routes/graphql/'.length
          }

          if (graphqlIndex !== -1) {
            const relativePath = id.slice(graphqlIndex + baseLength)
            // Remove .resolver.ts extension to get chunk name
            const chunkName = relativePath.replace(/\.resolver\.ts$/, '')
            return chunkName
          }
          return 'resolvers'
        }

        if (typeof manualChunks === 'function') {
          return manualChunks(id, meta)
        }
        return undefined
      }

      // advancedChunks for Rolldown - supports dynamic chunk naming via function!
      rollupConfig.output.advancedChunks = {
        groups: [
          {
            // Dynamic chunk naming for schemas
            name: (moduleId: string) => {
              if (!moduleId.endsWith('.graphql') && !moduleId.endsWith('.gql')) {
                return
              }

              let graphqlIndex = moduleId.indexOf('server/graphql/')
              let baseLength = 'server/graphql/'.length

              if (graphqlIndex === -1) {
                graphqlIndex = moduleId.indexOf('routes/graphql/')
                baseLength = 'routes/graphql/'.length
              }

              if (graphqlIndex !== -1) {
                const relativePath = moduleId.slice(graphqlIndex + baseLength)
                const chunkName = relativePath.replace(/\.(?:graphql|gql)$/, '-schema')
                return chunkName
              }

              return 'schemas'
            },
            test: /\.(?:graphql|gql)$/,
          },
          {
            // Dynamic chunk naming for resolvers
            name: (moduleId: string) => {
              if (!moduleId.endsWith('.resolver.ts')) {
                return
              }

              let graphqlIndex = moduleId.indexOf('server/graphql/')
              let baseLength = 'server/graphql/'.length

              if (graphqlIndex === -1) {
                graphqlIndex = moduleId.indexOf('routes/graphql/')
                baseLength = 'routes/graphql/'.length
              }

              if (graphqlIndex !== -1) {
                const relativePath = moduleId.slice(graphqlIndex + baseLength)
                const chunkName = relativePath.replace(/\.resolver\.ts$/, '')
                return chunkName
              }

              return 'resolvers'
            },
            test: /\.resolver\.(?:ts|js)$/,
          },
        ],
        minSize: 0,
        minShareCount: 1,
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
      '{serverGraphql}/context.d.ts',
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
import { defineGraphQLConfig } from 'nitro-graphql/define'

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

    // 4. server/graphql/context.d.ts - H3 context augmentation
    if (serverContextPath) {
      writeFileIfNotExists(serverContextPath, `// Example context definition - please change it to your needs
// import type { Database } from '../utils/useDb'

declare module 'nitro/h3' {
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
}

export {}
`, 'server context.d.ts')
    }

    // Check for old context.ts file and warn users to migrate
    if (existsSync(join(nitro.graphql.serverDir, 'context.ts'))) {
      logger.warn('Found context.ts file. Please rename it to context.d.ts for type-only definitions.')
      logger.info('The context file should now be context.d.ts instead of context.ts')
    }
  }
  else {
    logger.info('Scaffold file generation is disabled (library mode)')
  }
}
