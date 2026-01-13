/**
 * Dev Command
 *
 * Starts the GraphQL development server with hot reload.
 * Runtime-agnostic: works on Node.js, Bun, and Deno.
 */

import { defineCommand } from 'citty'
import consola from 'consola'
import { exit, onSignal } from '../../core/utils/runtime'
import { createCLIContext } from '../index'
import { startDevServer } from '../server/dev-server'
import { createDevWatcher } from '../server/watcher'

const logger = consola.withTag('nitro-graphql')

export const devCommand = defineCommand({
  meta: {
    name: 'dev',
    description: 'Start GraphQL development server',
  },
  args: {
    cwd: {
      type: 'string',
      description: 'Working directory',
    },
    port: {
      type: 'string',
      alias: 'p',
      default: '4000',
      description: 'Server port',
    },
    host: {
      type: 'string',
      alias: 'H',
      default: 'localhost',
      description: 'Server host',
    },
    open: {
      type: 'boolean',
      alias: 'o',
      description: 'Open browser',
    },
    watch: {
      type: 'boolean',
      alias: 'w',
      default: true,
      description: 'Enable file watching for hot reload',
    },
  },
  async run({ args }) {
    const ctx = await createCLIContext({ cwd: args.cwd })

    // Start server
    const serverInstance = await startDevServer(ctx, {
      port: Number.parseInt(args.port),
      hostname: args.host,
      open: args.open,
    })

    // Start file watcher for hot reload if enabled
    let watcher: Awaited<ReturnType<typeof createDevWatcher>> | null = null
    if (args.watch) {
      watcher = createDevWatcher(ctx, async () => {
        await serverInstance.reload()
      })
      logger.info('File watching enabled - changes will trigger hot reload')
    }

    // Handle shutdown
    const shutdown = async () => {
      logger.info('Shutting down...')
      if (watcher) {
        await watcher.close()
      }
      await serverInstance.close()
      exit(0)
    }

    onSignal('SIGINT', shutdown)
    onSignal('SIGTERM', shutdown)
  },
})
