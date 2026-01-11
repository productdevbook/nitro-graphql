/**
 * File watching and hot module reload for GraphQL files
 */

import type { FSWatcher } from 'chokidar'
import type { Nitro } from 'nitro/types'
import { watch } from 'chokidar'
import consola from 'consola'
import { join } from 'pathe'
import { debounce } from 'perfect-debounce'
import {
  DIR_SERVER_GRAPHQL,
  DIR_SERVER_GRAPHQL_WIN,
  DIRECTIVE_EXTENSIONS,
  GRAPHQL_EXTENSIONS,
  LOG_TAG,
  RESOLVER_EXTENSIONS,
} from '../../core/constants'
import { generateClientTypes, generateServerTypes } from '../codegen'
import {
  DEFAULT_WATCHER_IGNORE_INITIAL,
  DEFAULT_WATCHER_PERSISTENT,
} from '../config'
import { performGraphQLScan, shouldScanLocalFiles } from './scanner'

const logger = consola.withTag(LOG_TAG)

interface PendingChanges {
  server: boolean
  client: boolean
}

/**
 * Setup file watcher for GraphQL files (schemas, resolvers, directives, documents)
 * Watches for changes and triggers type regeneration and dev server reload
 */
export function setupFileWatcher(nitro: Nitro, watchDirs: string[]): FSWatcher {
  // Only watch graphql-related files, ignore everything else
  const ignored = (path: string) => {
    // Always ignore these directories
    if (path.includes('/node_modules/') || path.includes('/.git/')
      || path.includes('/.output/') || path.includes('/.nitro/')
      || path.includes('/.nuxt/') || path.includes('/.graphql/')) {
      return true
    }
    // Check if it's a directory (no extension or ends with /) - allow traversal
    if (!path.includes('.') || path.endsWith('/')) {
      return false
    }
    // Only watch graphql, resolver, and directive files
    const isGraphQL = GRAPHQL_EXTENSIONS.some(ext => path.endsWith(ext))
    const isResolver = RESOLVER_EXTENSIONS.some(ext => path.endsWith(ext))
    const isDirective = DIRECTIVE_EXTENSIONS.some(ext => path.endsWith(ext))
    return !isGraphQL && !isResolver && !isDirective
  }

  const watcher = watch(watchDirs, {
    persistent: DEFAULT_WATCHER_PERSISTENT,
    ignoreInitial: DEFAULT_WATCHER_IGNORE_INITIAL,
    ignored,
  })

  const pending: PendingChanges = { server: false, client: false }

  async function processChanges() {
    const changes = { ...pending }
    pending.server = pending.client = false

    if (changes.server) {
      // Use centralized scan function that respects skipLocalScan
      await performGraphQLScan(nitro, { silent: true, isRescan: true })

      logger.success('Types regenerated')
      await generateServerTypes(nitro, { silent: true })
      await generateClientTypes(nitro, { silent: true })

      await nitro.hooks.callHook('dev:reload')
    }
    else if (changes.client) {
      logger.success('Types regenerated')
      await generateClientTypes(nitro, { silent: true })
    }
  }

  const debouncedProcess = debounce(processChanges, 150)

  watcher.on('all', (_, path) => {
    if (path.includes('/sdk.ts') || path.includes('/sdk.js') || path.endsWith('/config.ts'))
      return

    const isGraphQL = GRAPHQL_EXTENSIONS.some(ext => path.endsWith(ext))
    const isResolver = RESOLVER_EXTENSIONS.some(ext => path.endsWith(ext))
    const isDirective = DIRECTIVE_EXTENSIONS.some(ext => path.endsWith(ext))

    if (!isGraphQL && !isResolver && !isDirective)
      return

    const isServer = path.includes(nitro.graphql.serverDir)
      || path.includes(DIR_SERVER_GRAPHQL)
      || path.includes(DIR_SERVER_GRAPHQL_WIN)

    if (isServer || isResolver || isDirective) {
      pending.server = true
    }
    else {
      pending.client = true
    }

    debouncedProcess()
  })

  return watcher
}

/**
 * Determine which directories to watch based on framework and configuration
 */
export function getWatchDirectories(nitro: Nitro, extendDirs: string[] = []): string[] {
  const watchDirs: string[] = []
  const framework = nitro.options.framework.name
  const scanLocal = shouldScanLocalFiles(nitro)

  switch (framework) {
    case 'nuxt': {
      // Watch client directory
      watchDirs.push(nitro.graphql.clientDir)

      // Watch server directory (main project)
      if (scanLocal) {
        watchDirs.push(nitro.graphql.serverDir)
      }

      // Add layer directories to watch list
      const layerServerDirs = nitro.options.graphql?.layerServerDirs || []
      const layerAppDirs = nitro.options.graphql?.layerAppDirs || []

      // Add server GraphQL directories from layers (only if local scanning enabled)
      if (scanLocal) {
        for (const layerServerDir of layerServerDirs) {
          watchDirs.push(join(layerServerDir, 'graphql'))
        }
      }

      // Add client GraphQL directories from layers (using app directories)
      for (const layerAppDir of layerAppDirs) {
        watchDirs.push(join(layerAppDir, 'graphql'))
      }
      break
    }
    case 'nitro':
      // Watch both client and server directories
      watchDirs.push(nitro.graphql.clientDir)
      if (scanLocal) {
        watchDirs.push(nitro.graphql.serverDir)
      }
      break
    default:
      // Unknown framework - watch both directories as fallback
      watchDirs.push(nitro.graphql.clientDir)
      if (scanLocal) {
        watchDirs.push(nitro.graphql.serverDir)
      }
  }

  // Add extend directories (from manifest packages)
  for (const dir of extendDirs) {
    if (!watchDirs.includes(dir)) {
      watchDirs.push(dir)
    }
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
          const resolvedDir = join(nitro.options.rootDir, baseDir)
          if (!watchDirs.includes(resolvedDir)) {
            watchDirs.push(resolvedDir)
          }
        }
      }
    }
  }

  return watchDirs
}
