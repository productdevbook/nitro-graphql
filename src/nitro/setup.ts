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
import { generateClientTypes, generateServerTypes } from './codegen'
import {
  DEFAULT_RUNTIME_CONFIG,
  DEFAULT_TYPES_CONFIG,
  DEFAULT_TYPESCRIPT_STRICT,
} from './config'
import { getDefaultPaths } from './paths'
import { rollupConfig } from './rollup'
import { resolveExtendDirs } from './setup/extend-loader'
import { getWatchDirectories, setupFileWatcher } from './setup/file-watcher'
import { logStartupInfo, resolveSecurityConfig } from './setup/logging'
import { setupRollupChunking, setupRollupExternals } from './setup/rollup-integration'
import { registerRouteHandlers } from './setup/routes'
import {
  isServerEnabled,
  logResolverDiagnostics,
  performGraphQLScan,
} from './setup/scanner'
import { setupTypeScriptPaths } from './setup/ts-config'

const logger = consola.withTag(LOG_TAG)

// Re-export for backward compatibility
export { resolveSecurityConfig } from './setup/logging'

/**
 * Main setup function for nitro-graphql
 * Coordinates all initialization steps for the module
 */
export async function setupNitroGraphQL(nitro: Nitro): Promise<void> {
  // Check if server mode is enabled (default: true)
  const serverEnabled = isServerEnabled(nitro)

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

  // Step 5.5: Resolve extend directories for file watching
  const extendDirs = await resolveExtendDirs(nitro)

  // Step 6: Setup file watching (dev mode only)
  if (nitro.options.dev) {
    setupFileWatching(nitro, serverEnabled, extendDirs)
  }

  // Step 7: Scan GraphQL files and resolve extend config
  // performGraphQLScan handles skipLocalScan, serverEnabled, and extend resolution
  await performGraphQLScan(nitro)

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
    directiveSchemas: null,
    extendConfigs: [],
    extendSchemas: [],
  }

  // Initialize empty arrays for server-related scans (needed even if server disabled)
  nitro.scanSchemas ||= []
  nitro.scanResolvers ||= []
  nitro.scanDirectives ||= []
  nitro.scanDocuments ||= []

  // Auto-enable WebSocket feature when subscriptions are enabled
  if (nitro.options.graphql?.subscriptions?.enabled) {
    nitro.options.features = {
      ...nitro.options.features,
      websocket: true,
    }
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
  // Use .graphql/ in root directory instead of .nitro/graphql/
  const graphqlBuildDir = resolve(nitro.options.rootDir, '.graphql')
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
function setupFileWatching(nitro: Nitro, serverEnabled: boolean, extendDirs: string[] = []): void {
  // In client-only mode, only watch client directories
  const watchDirs = serverEnabled
    ? getWatchDirectories(nitro, extendDirs)
    : [nitro.graphql.clientDir].filter(Boolean)

  nitro.graphql.watchDirs = watchDirs

  const watcher = setupFileWatcher(nitro, watchDirs)

  nitro.hooks.hook('close', () => {
    watcher.close()
  })
}

/**
 * Setup dev mode hooks for rescanning files
 */
function setupDevHooks(nitro: Nitro): void {
  // Track if we've already shown initial logs to prevent duplicates
  let hasShownInitialLogs = false
  // Debounce to prevent rapid successive calls
  let lastDevStart = 0
  const DEBOUNCE_MS = 500

  nitro.hooks.hook('dev:start', async () => {
    // Debounce rapid successive dev:start calls
    const now = Date.now()
    if (now - lastDevStart < DEBOUNCE_MS) {
      return
    }
    lastDevStart = now

    // Rescan using unified scan function (handles skipLocalScan, extend, etc.)
    await performGraphQLScan(nitro, { isRescan: true, silent: true })

    // Validate resolver setup and provide helpful diagnostics (only in dev)
    // Only show once during startup to avoid duplicate logs
    if (nitro.options.dev && !hasShownInitialLogs) {
      hasShownInitialLogs = true
      logResolverDiagnostics(nitro)
    }
  })
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
