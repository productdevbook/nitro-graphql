/**
 * Shared setup logic for nitro-graphql module
 * Used by both the direct Nitro module export and the Vite plugin's nitro: hook
 *
 * This is the main orchestrator that coordinates all setup steps
 */

import type { Nitro } from 'nitro/types'
import consola from 'consola'
import defu from 'defu'
import { relative, resolve } from 'pathe'
import { validateExternalServices } from '../core'
import {
  FRAMEWORK_NITRO,
  FRAMEWORK_NUXT,
  LOG_TAG,
} from '../core/constants'
import { generateDirectiveSchemas } from '../core/utils/directive-parser'
import { NitroAdapter } from './adapter'
import { generateClientTypes, generateServerTypes } from './codegen'
import {
  DEFAULT_RUNTIME_CONFIG,
  DEFAULT_TYPES_CONFIG,
  DEFAULT_TYPESCRIPT_STRICT,
} from './config'
import { getDefaultPaths } from './paths'
import { rollupConfig } from './rollup'
import { getWatchDirectories, setupFileWatcher } from './setup/file-watcher'
import { logStartupInfo, resolveSecurityConfig } from './setup/logging'
import { setupRollupChunking, setupRollupExternals } from './setup/rollup-integration'
import { registerRouteHandlers } from './setup/routes'
import { setupTypeScriptPaths } from './setup/ts-config'

const logger = consola.withTag(LOG_TAG)

// Re-export for backward compatibility
export { resolveSecurityConfig } from './setup/logging'

/**
 * Scan all GraphQL files and update Nitro state
 */
async function scanAllGraphQLFiles(nitro: Nitro): Promise<void> {
  // Scan directives first
  const directivesResult = await NitroAdapter.scanDirectives(nitro)
  nitro.scanDirectives = directivesResult.items

  // Generate _directives.graphql file
  if (!nitro.scanSchemas)
    nitro.scanSchemas = []
  const directivesPath = await generateDirectiveSchemas(nitro, directivesResult.items)

  // Scan schemas
  const schemasResult = await NitroAdapter.scanSchemas(nitro)
  const schemas = schemasResult.items
  if (directivesPath && !schemas.includes(directivesPath))
    schemas.push(directivesPath)
  nitro.scanSchemas = schemas

  // Scan documents and resolvers
  const docsResult = await NitroAdapter.scanDocuments(nitro)
  nitro.scanDocuments = docsResult.items

  const resolversResult = await NitroAdapter.scanResolvers(nitro)
  nitro.scanResolvers = resolversResult.items
}

/**
 * Main setup function for nitro-graphql
 * Coordinates all initialization steps for the module
 */
export async function setupNitroGraphQL(nitro: Nitro): Promise<void> {
  // Check if server mode is enabled (default: true)
  const serverEnabled = nitro.options.graphql?.server !== false

  // Step 1: Initialize configuration
  initializeConfiguration(nitro, serverEnabled)

  // Step 2: Validate configuration
  validateConfiguration(nitro)

  // Step 3: Setup build directories
  setupBuildDirectories(nitro)

  // Step 4: Setup Rollup/Rolldown configuration (only if server enabled)
  if (serverEnabled) {
    setupRollupExternals(nitro)
    setupRollupChunking(nitro)
  }

  // Step 5: Initialize runtime configuration
  initializeRuntimeConfig(nitro)

  // Step 6: Setup file watching (dev mode)
  setupFileWatching(nitro, serverEnabled)

  // Step 7: Scan GraphQL files (conditionally based on server mode)
  await scanGraphQLFiles(nitro, serverEnabled)

  // Step 8: Setup dev hooks (only if server enabled)
  if (serverEnabled) {
    setupDevHooks(nitro)
  }

  // Step 9: Configure Rollup virtual modules (only if server enabled)
  if (serverEnabled) {
    await rollupConfig(nitro)
  }

  // Step 10: Generate types (initial generation)
  await generateTypes(nitro, serverEnabled)

  // Step 11: Setup close hooks
  setupCloseHooks(nitro, serverEnabled)

  // Step 12: Register route handlers (only if server enabled)
  if (serverEnabled) {
    registerRouteHandlers(nitro)
  }

  // Step 13: Setup TypeScript configuration
  setupTypeScriptConfiguration(nitro)

  // Step 14: Setup Nuxt integration (if applicable)
  setupNuxtIntegration(nitro)

  // Log startup info
  logStartupInfo(nitro, serverEnabled)
}

/**
 * Initialize default configuration values
 */
function initializeConfiguration(nitro: Nitro, serverEnabled: boolean): void {
  // Initialize graphql config
  nitro.options.graphql ||= {}

  // Setup default types configuration
  nitro.options.graphql.types = defu(nitro.options.graphql.types, DEFAULT_TYPES_CONFIG)

  // Warn if no framework specified (only if server is enabled)
  if (serverEnabled && !nitro.options.graphql?.framework) {
    logger.warn('No GraphQL framework specified. Please set graphql.framework to "graphql-yoga" or "apollo-server".')
  }

  // Get default paths from path resolver
  const defaultPaths = getDefaultPaths(nitro)

  // Initialize nitro.graphql object
  nitro.graphql ||= {
    buildDir: '',
    watchDirs: [],
    clientDir: defaultPaths.clientDir,
    serverDir: defaultPaths.serverDir,
    dir: {
      build: relative(nitro.options.rootDir, nitro.options.buildDir),
      client: 'graphql',
      server: 'server',
    },
  }

  // Initialize empty arrays for server-related scans (needed even if server disabled)
  nitro.scanSchemas ||= []
  nitro.scanResolvers ||= []
  nitro.scanDirectives ||= []
  nitro.scanDocuments ||= []
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
  // Resolve security config with environment-aware defaults
  const securityConfig = resolveSecurityConfig(nitro.options.graphql?.security)

  nitro.options.runtimeConfig.graphql = defu(
    nitro.options.runtimeConfig.graphql || {},
    {
      ...DEFAULT_RUNTIME_CONFIG,
      security: securityConfig,
    },
  ) as typeof nitro.options.runtimeConfig.graphql
}

/**
 * Setup file watching for development mode
 */
function setupFileWatching(nitro: Nitro, serverEnabled: boolean): void {
  // In client-only mode, only watch client directories
  const watchDirs = serverEnabled
    ? getWatchDirectories(nitro)
    : [nitro.graphql.clientDir].filter(Boolean)

  nitro.graphql.watchDirs = watchDirs

  const watcher = setupFileWatcher(nitro, watchDirs)

  nitro.hooks.hook('close', () => {
    watcher.close()
  })
}

/**
 * Scan all GraphQL files (schemas, resolvers, directives, documents)
 */
async function scanGraphQLFiles(nitro: Nitro, serverEnabled: boolean): Promise<void> {
  const skipLocalScan = nitro.options.graphql?.skipLocalScan === true
  const extendSources = nitro.options.graphql?.extend

  // Check if skipLocalScan is enabled
  if (skipLocalScan && extendSources?.length) {
    logger.info(`Using ${extendSources.length} extend source(s), skipping local scanning`)

    // Initialize empty arrays (virtual modules will import from extend)
    nitro.scanSchemas = []
    nitro.scanResolvers = []
    nitro.scanDirectives = []

    // Still scan documents for client-side usage
    const result = await NitroAdapter.scanDocuments(nitro)
    nitro.scanDocuments = result.items
    return
  }

  if (serverEnabled) {
    // Full scan: schemas, resolvers, directives, and documents
    await scanAllGraphQLFiles(nitro)
  }
  else {
    // Client-only mode: only scan documents (for external services)
    const result = await NitroAdapter.scanDocuments(nitro)
    nitro.scanDocuments = result.items
  }
}

/**
 * Setup dev mode hooks for rescanning files
 */
function setupDevHooks(nitro: Nitro): void {
  // Track if we've already shown initial logs to prevent duplicates
  let hasShownInitialLogs = false

  nitro.hooks.hook('dev:start', async () => {
    // Rescan all GraphQL files
    await scanAllGraphQLFiles(nitro)

    // Validate resolver setup and provide helpful diagnostics (only in dev)
    // Only show once during startup to avoid duplicate logs
    if (nitro.options.dev && !hasShownInitialLogs) {
      hasShownInitialLogs = true
      logResolverDiagnostics(nitro)
    }
  })
}

/**
 * Log resolver diagnostics for development
 */
function logResolverDiagnostics(nitro: Nitro): void {
  const resolvers = nitro.scanResolvers || []

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

/**
 * Generate server and client types
 */
async function generateTypes(nitro: Nitro, serverEnabled: boolean): Promise<void> {
  if (serverEnabled) {
    // Generate server and client types (initial generation with logs)
    await generateServerTypes(nitro)
    await generateClientTypes(nitro, { isInitial: true })
  }
  else {
    // Client-only mode: only generate client types (for external services)
    await generateClientTypes(nitro, { isInitial: true })
  }
}

/**
 * Setup close hooks for final type generation
 */
function setupCloseHooks(nitro: Nitro, serverEnabled: boolean): void {
  nitro.hooks.hook('close', async () => {
    if (serverEnabled) {
      await generateServerTypes(nitro, { silent: true })
    }
    await generateClientTypes(nitro, { silent: true })
  })
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
