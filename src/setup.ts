/**
 * Shared setup logic for nitro-graphql module
 * Used by both the direct Nitro module export and the Vite plugin's nitro: hook
 *
 * This is the main orchestrator that coordinates all setup steps
 */

import type { Nitro } from 'nitro/types'
import { fileURLToPath } from 'node:url'
import consola from 'consola'
import defu from 'defu'
import { join, relative, resolve } from 'pathe'
import {
  DEFAULT_RUNTIME_CONFIG,
  DEFAULT_TYPES_CONFIG,
  DEFAULT_TYPESCRIPT_STRICT,
} from './config/defaults'
import {
  ENDPOINT_DEBUG,
  FRAMEWORK_NITRO,
  FRAMEWORK_NUXT,
  GRAPHQL_HTTP_METHODS,
  LOG_TAG,
} from './constants'
import { rollupConfig } from './rollup'
import { getWatchDirectories, setupFileWatcher } from './setup/file-watcher'
import { setupRollupChunking, setupRollupExternals } from './setup/rollup-integration'
import { generateScaffoldFiles } from './setup/scaffold-generator'
import { setupTypeScriptPaths } from './setup/ts-config'
import {
  generateDirectiveSchemas,
  scanDirectives,
  scanDocuments,
  scanResolvers,
  scanSchemas,
  validateExternalServices,
} from './utils'
import { getDefaultPaths } from './utils/path-resolver'
import { clientTypeGeneration, serverTypeGeneration } from './utils/type-generation'

const logger = consola.withTag(LOG_TAG)

/**
 * Main setup function for nitro-graphql
 * Coordinates all initialization steps for the module
 */
export async function setupNitroGraphQL(nitro: Nitro): Promise<void> {
  // Step 1: Initialize configuration
  initializeConfiguration(nitro)

  // Step 2: Validate configuration
  validateConfiguration(nitro)

  // Step 3: Setup build directories
  setupBuildDirectories(nitro)

  // Step 4: Setup Rollup/Rolldown configuration
  setupRollupExternals(nitro)
  setupRollupChunking(nitro)

  // Step 5: Initialize runtime configuration
  initializeRuntimeConfig(nitro)

  // Step 6: Setup file watching (dev mode)
  setupFileWatching(nitro)

  // Step 7: Scan GraphQL files
  await scanGraphQLFiles(nitro)

  // Step 8: Setup dev hooks
  setupDevHooks(nitro)

  // Step 9: Configure Rollup virtual modules
  await rollupConfig(nitro)

  // Step 10: Generate types (initial generation)
  await generateTypes(nitro)

  // Step 11: Setup close hooks
  setupCloseHooks(nitro)

  // Step 12: Register route handlers
  registerRouteHandlers(nitro)

  // Step 13: Setup TypeScript configuration
  setupTypeScriptConfiguration(nitro)

  // Step 14: Setup Nuxt integration (if applicable)
  setupNuxtIntegration(nitro)

  // Step 15: Generate scaffold files
  generateScaffoldFiles(nitro)
}

/**
 * Initialize default configuration values
 */
function initializeConfiguration(nitro: Nitro): void {
  // Initialize graphql config
  nitro.options.graphql ||= {}

  // Setup default types configuration
  nitro.options.graphql.types = defu(nitro.options.graphql.types, DEFAULT_TYPES_CONFIG)

  // Warn if no framework specified
  if (!nitro.options.graphql?.framework) {
    logger.warn('No GraphQL framework specified. Please set graphql.framework to "graphql-yoga" or "apollo-server".')
  }

  // Get default paths from path resolver
  const defaultPaths = getDefaultPaths(nitro)

  // Initialize nitro.graphql object
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
}

/**
 * Validate external services configuration
 */
function validateConfiguration(nitro: Nitro): void {
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

  // Log federation status if enabled
  if (nitro.options.graphql?.federation?.enabled) {
    logger.info(`Apollo Federation enabled for service: ${nitro.options.graphql.federation.serviceName || 'unnamed'}`)
  }
}

/**
 * Setup build directories
 */
function setupBuildDirectories(nitro: Nitro): void {
  const graphqlBuildDir = resolve(nitro.options.buildDir, 'graphql')
  nitro.graphql.buildDir = graphqlBuildDir

  // Update relative dir paths based on framework
  const framework = nitro.options.framework.name

  switch (framework) {
    case FRAMEWORK_NUXT:
      nitro.graphql.dir.client = relative(nitro.options.rootDir, nitro.graphql.clientDir)
      nitro.graphql.dir.server = relative(nitro.options.rootDir, nitro.graphql.serverDir)
      break
    case FRAMEWORK_NITRO:
      nitro.graphql.dir.client = relative(nitro.options.rootDir, nitro.graphql.clientDir)
      nitro.graphql.dir.server = relative(nitro.options.rootDir, nitro.graphql.serverDir)
      break
    default:
      // Unknown framework - use defaults
      break
  }
}

/**
 * Initialize runtime configuration
 */
function initializeRuntimeConfig(nitro: Nitro): void {
  nitro.options.runtimeConfig.graphql = defu(
    nitro.options.runtimeConfig.graphql || {},
    DEFAULT_RUNTIME_CONFIG,
  )
}

/**
 * Setup file watching for development mode
 */
function setupFileWatching(nitro: Nitro): void {
  const watchDirs = getWatchDirectories(nitro)
  nitro.graphql.watchDirs = watchDirs

  const watcher = setupFileWatcher(nitro, watchDirs)

  nitro.hooks.hook('close', () => {
    watcher.close()
  })
}

/**
 * Scan all GraphQL files (schemas, resolvers, directives, documents)
 */
async function scanGraphQLFiles(nitro: Nitro): Promise<void> {
  // Step 1: Scan directives FIRST
  const directives = await scanDirectives(nitro)
  nitro.scanDirectives = directives

  // Step 2: Generate _directives.graphql file and get its path
  nitro.scanSchemas = []
  const directivesPath = await generateDirectiveSchemas(nitro, directives)

  // Step 3: Scan schemas from server directory
  const schemas = await scanSchemas(nitro)

  // Step 4: Add generated _directives.graphql to schemas if it exists
  if (directivesPath && !schemas.includes(directivesPath)) {
    schemas.push(directivesPath)
  }
  nitro.scanSchemas = schemas

  // Step 5: Scan documents
  const docs = await scanDocuments(nitro)
  nitro.scanDocuments = docs

  // Step 6: Scan resolvers
  const resolvers = await scanResolvers(nitro)
  nitro.scanResolvers = resolvers
}

/**
 * Setup dev mode hooks for rescanning files
 */
function setupDevHooks(nitro: Nitro): void {
  // Track if we've already shown initial logs to prevent duplicates
  let hasShownInitialLogs = false

  nitro.hooks.hook('dev:start', async () => {
    // Step 1: Scan directives FIRST
    const directives = await scanDirectives(nitro)
    nitro.scanDirectives = directives

    // Step 2: Regenerate directive schemas and get path
    if (!nitro.scanSchemas) {
      nitro.scanSchemas = []
    }
    const directivesPath = await generateDirectiveSchemas(nitro, directives)

    // Step 3: Scan schemas from server directory
    const schemas = await scanSchemas(nitro)

    // Step 4: Add generated _directives.graphql to schemas if it exists
    if (directivesPath && !schemas.includes(directivesPath)) {
      schemas.push(directivesPath)
    }
    nitro.scanSchemas = schemas

    // Step 5: Scan documents
    const docs = await scanDocuments(nitro)
    nitro.scanDocuments = docs

    // Step 6: Scan resolvers
    const resolvers = await scanResolvers(nitro)
    nitro.scanResolvers = resolvers

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
}

/**
 * Generate server and client types
 */
async function generateTypes(nitro: Nitro): Promise<void> {
  // Generate server and client types (initial generation with logs)
  await serverTypeGeneration(nitro)
  await clientTypeGeneration(nitro, { isInitial: true })
}

/**
 * Setup close hooks for final type generation
 */
function setupCloseHooks(nitro: Nitro): void {
  nitro.hooks.hook('close', async () => {
    await serverTypeGeneration(nitro, { silent: true })
    await clientTypeGeneration(nitro, { silent: true })
  })
}

/**
 * Register GraphQL route handlers
 */
function registerRouteHandlers(nitro: Nitro): void {
  const runtime = fileURLToPath(new URL('routes', import.meta.url))
  const framework = nitro.options.graphql?.framework

  // Main GraphQL endpoint
  if (framework === 'graphql-yoga') {
    for (const method of GRAPHQL_HTTP_METHODS) {
      nitro.options.handlers.push({
        route: nitro.options.runtimeConfig.graphql?.endpoint?.graphql || '/api/graphql',
        handler: join(runtime, 'graphql-yoga'),
        method,
      })
    }
  }

  if (framework === 'apollo-server') {
    for (const method of GRAPHQL_HTTP_METHODS) {
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
      route: ENDPOINT_DEBUG,
      handler: join(runtime, 'debug'),
      method: 'GET',
    })
  }
}

/**
 * Setup TypeScript configuration and path aliases
 */
function setupTypeScriptConfiguration(nitro: Nitro): void {
  nitro.options.typescript.strict = DEFAULT_TYPESCRIPT_STRICT

  nitro.hooks.hook('types:extend', (types) => {
    setupTypeScriptPaths(nitro, types)
  })
}

/**
 * Setup Nuxt-specific integration
 */
function setupNuxtIntegration(nitro: Nitro): void {
  // Store external services info for Nuxt module
  if (nitro.options.framework?.name === FRAMEWORK_NUXT && nitro.options.graphql?.externalServices?.length) {
    // Add external services to Nuxt context so the Nuxt module can access them
    nitro.hooks.hook('build:before', () => {
      const nuxtOptions = (nitro as { _nuxt?: { options?: any } })._nuxt?.options
      if (nuxtOptions) {
        nuxtOptions.nitroGraphqlExternalServices = nitro.options.graphql?.externalServices || []
      }
    })
  }
}
