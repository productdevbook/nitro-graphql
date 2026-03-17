/**
 * Shared setup logic for nitro-graphql module
 * Used by both the direct Nitro module export and the Vite plugin's nitro: hook
 *
 * Uses a resolver chain pattern (inspired by Nitro v3) where each setup step
 * is an independent function that operates on the Nitro instance.
 */

import type { Nitro } from 'nitro/types'
import consola from 'consola'
import defu from 'defu'
import { relative, resolve } from 'pathe'
import { validateExternalServices } from '../core'
import { LOG_TAG } from '../core/constants'
import {
  DEFAULT_RUNTIME_CONFIG,
  DEFAULT_TYPES_CONFIG,
  DEFAULT_TYPESCRIPT_STRICT,
} from './defaults'
import { getDefaultPaths } from './paths'
import { rollupConfig } from './rollup'
import { resolveExtendDirs } from './setup/extend-loader'
import { getWatchDirectories, setupFileWatcher } from './setup/file-watcher'
import { logStartupInfo } from './setup/logging'
import { setupNoExternals, setupRollupChunking, setupRollupExternals } from './setup/rollup-integration'
import { registerRouteHandlers } from './setup/routes'
import {
  isServerEnabled,
  logResolverDiagnostics,
  performGraphQLScan,
} from './setup/scanner'
import { resolveSecurityConfig } from './setup/security'
import { setupTypeScriptPaths } from './setup/ts-config'
import { regenerateTypes } from './setup/type-generation'
import { emptyScanState } from './state'

const logger = consola.withTag(LOG_TAG)

// Re-export for backward compatibility
export { resolveSecurityConfig } from './setup/security'
export { regenerateTypes } from './setup/type-generation'

/**
 * Setup resolver — each resolver is a focused function that configures one aspect.
 * Resolvers are executed sequentially; each operates on the shared Nitro instance.
 */
type SetupResolver = (nitro: Nitro) => void | Promise<void>

/**
 * Main setup function for nitro-graphql
 * Executes setup resolvers in sequence
 */
export async function setupNitroGraphQL(nitro: Nitro): Promise<void> {
  const resolvers: SetupResolver[] = [
    resolveConfiguration,
    resolveValidation,
    resolveBuildDirectories,
    resolveRollupIntegration,
    resolveRuntimeConfig,
    resolveFileWatching,
    resolveGraphQLScan,
    resolveDevHooks,
    resolveVirtualModules,
    resolveTypeGeneration,
    resolveCloseHooks,
    resolveRouteHandlers,
    resolveTypeScriptConfig,
    resolveStartupLogging,
  ]

  for (const resolver of resolvers) {
    await resolver(nitro)
  }
}

// ============ SETUP RESOLVERS ============
// Each resolver is a focused function that configures one aspect of the module.

/**
 * Resolve default configuration values and initialize Nitro GraphQL state
 */
function resolveConfiguration(nitro: Nitro): void {
  nitro.options.graphql ||= {}
  nitro.options.graphql.types = defu(nitro.options.graphql.types, DEFAULT_TYPES_CONFIG)

  const serverEnabled = isServerEnabled(nitro)
  if (serverEnabled && !nitro.options.graphql?.framework) {
    logger.warn('No GraphQL framework specified. Please set graphql.framework to "graphql-yoga" or "apollo-server".')
  }

  const defaultPaths = getDefaultPaths(nitro)

  nitro.graphql ||= {
    state: emptyScanState(),
    buildDir: '',
    watchDirs: [],
    clientDir: defaultPaths.clientDir,
    serverDir: defaultPaths.serverDir,
    dir: {
      build: relative(nitro.options.rootDir, nitro.options.buildDir),
      client: 'graphql',
      server: 'server',
    },
    // Legacy compat fields (kept in sync with state)
    directiveSchemas: null,
    extendConfigs: [],
    extendSchemas: [],
  }

  // Legacy compat: initialize deprecated scan arrays
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
 * Validate external services and federation configuration
 */
function resolveValidation(nitro: Nitro): void {
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

  if (nitro.options.graphql?.federation?.enabled) {
    logger.info(`Apollo Federation enabled for service: ${nitro.options.graphql.federation.serviceName || 'unnamed'}`)
  }
}

/**
 * Resolve build directories and relative paths
 */
function resolveBuildDirectories(nitro: Nitro): void {
  nitro.graphql.buildDir = resolve(nitro.options.rootDir, '.graphql')

  // Compute relative dir paths (same logic for all frameworks)
  nitro.graphql.dir.client = relative(nitro.options.rootDir, nitro.graphql.clientDir)
  nitro.graphql.dir.server = relative(nitro.options.rootDir, nitro.graphql.serverDir)
}

/**
 * Resolve Rollup/Rolldown integration (externals, chunking, noExternals)
 */
function resolveRollupIntegration(nitro: Nitro): void {
  if (!isServerEnabled(nitro))
    return

  setupNoExternals(nitro)
  setupRollupExternals(nitro)
  setupRollupChunking(nitro)
}

/**
 * Resolve runtime configuration with security defaults
 */
function resolveRuntimeConfig(nitro: Nitro): void {
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
 * Resolve file watching for development mode
 */
async function resolveFileWatching(nitro: Nitro): Promise<void> {
  if (!nitro.options.dev)
    return

  const serverEnabled = isServerEnabled(nitro)
  const extendDirs = await resolveExtendDirs(nitro)

  const watchDirs = serverEnabled
    ? getWatchDirectories(nitro, extendDirs)
    : [nitro.graphql.clientDir].filter(Boolean)

  nitro.graphql.watchDirs = watchDirs

  const watcher = setupFileWatcher(nitro, watchDirs)
  nitro.hooks.hook('close', () => watcher.close())
}

/**
 * Resolve initial GraphQL file scanning
 */
async function resolveGraphQLScan(nitro: Nitro): Promise<void> {
  await performGraphQLScan(nitro)
}

/**
 * Resolve dev mode hooks for rescanning and diagnostics
 */
function resolveDevHooks(nitro: Nitro): void {
  if (!isServerEnabled(nitro))
    return

  let hasShownInitialLogs = false
  let lastDevStart = 0
  const DEBOUNCE_MS = 500

  nitro.hooks.hook('dev:start', async () => {
    const now = Date.now()
    if (now - lastDevStart < DEBOUNCE_MS)
      return
    lastDevStart = now

    await performGraphQLScan(nitro, { isRescan: true, silent: true })

    if (nitro.options.dev && !hasShownInitialLogs) {
      hasShownInitialLogs = true
      logResolverDiagnostics(nitro)
    }
  })
}

/**
 * Resolve virtual modules registration via Rollup config
 */
async function resolveVirtualModules(nitro: Nitro): Promise<void> {
  if (!isServerEnabled(nitro))
    return
  await rollupConfig(nitro)
}

/**
 * Resolve initial type generation
 */
async function resolveTypeGeneration(nitro: Nitro): Promise<void> {
  await regenerateTypes(nitro, { serverEnabled: isServerEnabled(nitro) })
}

/**
 * Resolve close hooks for final type generation
 */
function resolveCloseHooks(nitro: Nitro): void {
  nitro.hooks.hook('close', async () => {
    await regenerateTypes(nitro, { silent: true })
  })
}

/**
 * Resolve route handler registration
 */
function resolveRouteHandlers(nitro: Nitro): void {
  if (!isServerEnabled(nitro))
    return
  registerRouteHandlers(nitro)
}

/**
 * Resolve TypeScript configuration and path aliases
 */
function resolveTypeScriptConfig(nitro: Nitro): void {
  nitro.options.typescript.strict = DEFAULT_TYPESCRIPT_STRICT
  nitro.hooks.hook('types:extend', (types) => {
    setupTypeScriptPaths(nitro, types)
  })
}

/**
 * Resolve startup logging
 */
function resolveStartupLogging(nitro: Nitro): void {
  logStartupInfo(nitro, isServerEnabled(nitro))
}
