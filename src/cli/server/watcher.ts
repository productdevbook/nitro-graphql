/**
 * CLI File Watcher
 *
 * Uses core watcher module for shared logic.
 * CLI-specific actions (generate, reload) are passed as callbacks.
 */

import type { CLIContext } from '../index'
import consola from 'consola'
import { LOG_TAG } from '../../core/constants'
import { closeWatcher, createCoreWatcher } from '../../core/watcher'
import { generateAll } from '../commands/generate'

const logger = consola.withTag(LOG_TAG)

export interface WatcherInstance {
  /** Close the watcher */
  close: () => Promise<void>
}

/**
 * Create a file watcher for the dev server
 *
 * Uses core watcher module with CLI-specific callbacks.
 * Watches for changes in:
 * - GraphQL schema files (*.graphql)
 * - Resolver files (*.resolver.ts)
 * - Directive files (*.directive.ts)
 * - Client documents (*.graphql in client dir)
 */
export function createDevWatcher(
  ctx: CLIContext,
  onReload: () => Promise<void>,
): WatcherInstance {
  const serverDir = ctx.config.serverDir
  const clientDir = ctx.config.clientDir

  // Watch directories (like Nitro), not glob patterns
  const watchDirs = [serverDir]
  if (clientDir !== serverDir) {
    watchDirs.push(clientDir)
  }

  logger.info('Watching for changes in:', watchDirs.join(', '))

  const watcher = createCoreWatcher(
    {
      watchDirs,
      serverDir,
      debounceMs: 150,
    },
    {
      onServerChange: async () => {
        logger.info('Server files changed, regenerating...')

        try {
          // Regenerate types
          await generateAll(ctx, { silent: true, runtime: false })

          // Trigger reload
          await onReload()
        }
        catch (error) {
          logger.error('Hot reload failed:', error)
        }
      },
      onClientChange: async () => {
        logger.info('Client files changed, regenerating...')

        try {
          // For CLI, regenerate all (simpler than separating server/client)
          await generateAll(ctx, { silent: true, runtime: false })
        }
        catch (error) {
          logger.error('Client type generation failed:', error)
        }
      },
      onReady: () => {
        logger.success('File watcher ready')
      },
      onError: (error) => {
        logger.error('Watcher error:', error)
      },
    },
  )

  return {
    async close() {
      await closeWatcher(watcher)
      logger.debug('File watcher closed')
    },
  }
}
