/**
 * File watching and hot module reload for GraphQL files
 *
 * Uses core watcher module for shared logic.
 * Nitro-specific actions (scan, codegen, hooks) are passed as callbacks.
 */

import type { FSWatcher } from 'chokidar'
import type { Nitro } from 'nitro/types'
import consola from 'consola'
import { join } from 'pathe'
import { LOG_TAG } from '../../core/constants'
import { createCoreWatcher } from '../../core/watcher'
import { generateClientTypes } from '../codegen'
import { performGraphQLScan, shouldScanLocalFiles } from './scanner'
import { regenerateTypes } from './type-generation'

const TRAILING_SLASH_RE = /\/$/

const logger = consola.withTag(LOG_TAG)

/**
 * Setup file watcher for GraphQL files (schemas, resolvers, directives, documents)
 * Watches for changes and triggers type regeneration and dev server reload
 *
 * Uses core watcher module with Nitro-specific callbacks.
 */
export function setupFileWatcher(nitro: Nitro, watchDirs: string[]): FSWatcher {
  return createCoreWatcher(
    {
      watchDirs,
      serverDir: nitro.graphql.serverDir,
      debounceMs: 150,
    },
    {
      onServerChange: async () => {
        // Use centralized scan function that respects skipLocalScan
        await performGraphQLScan(nitro, { silent: true, isRescan: true })

        // Regenerate all types using shared helper
        await regenerateTypes(nitro, { silent: true })

        logger.success('Types regenerated')

        // Trigger Nitro HMR
        await nitro.hooks.callHook('dev:reload')
      },
      onClientChange: async () => {
        // Only regenerate client types
        await generateClientTypes(nitro, { silent: true })
        logger.success('Client types regenerated')
      },
      onError: (error) => {
        logger.error('Watcher error:', error)
      },
    },
  )
}

/**
 * Determine which directories to watch based on framework and configuration
 * Note: Layer directories are now handled via extendDirs (passed from extend-loader)
 */
export function getWatchDirectories(nitro: Nitro, extendDirs: string[] = []): string[] {
  const watchDirs: string[] = []
  const scanLocal = shouldScanLocalFiles(nitro)

  // Watch client directory
  watchDirs.push(nitro.graphql.clientDir)

  // Watch server directory (main project)
  if (scanLocal) {
    watchDirs.push(nitro.graphql.serverDir)
  }

  // Add extend directories (includes layers converted to extends by Nuxt module)
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
          const baseDir = pattern.split('**')[0]?.replace(TRAILING_SLASH_RE, '') || '.'
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
