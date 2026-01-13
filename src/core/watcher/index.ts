/**
 * Core File Watcher
 *
 * Shared file watching logic for GraphQL files.
 * Used by both Nitro module and CLI dev server.
 */

import type { FSWatcher } from 'chokidar'
import { watch } from 'chokidar'
import { debounce } from 'perfect-debounce'
import {
  DIRECTIVE_EXTENSIONS,
  GRAPHQL_EXTENSIONS,
  RESOLVER_EXTENSIONS,
} from '../constants'

/**
 * Configuration for core watcher
 */
export interface CoreWatcherConfig {
  /** Directories to watch */
  watchDirs: string[]
  /** Server directory path (to classify changes) */
  serverDir: string
  /** Debounce delay in ms (default: 150) */
  debounceMs?: number
  /** Persistent watcher (default: true) */
  persistent?: boolean
  /** Ignore initial scan (default: true) */
  ignoreInitial?: boolean
  /** Use polling mode (default: false, but auto-enabled in CI/test environments) */
  usePolling?: boolean
}

/**
 * Callbacks for watcher events
 */
export interface CoreWatcherCallbacks {
  /** Called when server files change (schemas, resolvers, directives) */
  onServerChange: () => Promise<void>
  /** Called when client files change (documents only) */
  onClientChange: () => Promise<void>
  /** Called when watcher is ready */
  onReady?: () => void
  /** Called on watcher error */
  onError?: (error: Error) => void
}

/**
 * File type classification
 */
export type FileType = 'graphql' | 'resolver' | 'directive' | null

/**
 * Change type classification
 */
export type ChangeType = 'server' | 'client' | null

/**
 * Check if a file is a GraphQL-related file
 */
export function getFileType(path: string): FileType {
  if (GRAPHQL_EXTENSIONS.some(ext => path.endsWith(ext))) {
    return 'graphql'
  }
  if (RESOLVER_EXTENSIONS.some(ext => path.endsWith(ext))) {
    return 'resolver'
  }
  if (DIRECTIVE_EXTENSIONS.some(ext => path.endsWith(ext))) {
    return 'directive'
  }
  return null
}

/**
 * Check if a file should be watched
 */
export function isWatchableFile(path: string): boolean {
  return getFileType(path) !== null
}

/**
 * Classify a file change as server or client
 */
export function classifyChange(path: string, serverDir: string): ChangeType {
  const fileType = getFileType(path)
  if (!fileType)
    return null

  // Resolvers and directives are always server
  if (fileType === 'resolver' || fileType === 'directive') {
    return 'server'
  }

  // GraphQL files: check if in server directory
  if (fileType === 'graphql') {
    // Normalize paths for comparison
    const normalizedPath = path.replace(/\\/g, '/')
    const normalizedServerDir = serverDir.replace(/\\/g, '/')

    if (normalizedPath.includes(normalizedServerDir)) {
      return 'server'
    }
    // Also check common server patterns
    if (normalizedPath.includes('/server/graphql/') || normalizedPath.includes('\\server\\graphql\\')) {
      return 'server'
    }
    return 'client'
  }

  return null
}

/**
 * Create the ignored function for chokidar
 * Filters out non-GraphQL files and system directories
 */
export function createIgnoredFunction(): (path: string) => boolean {
  return (path: string) => {
    // Always ignore these directories
    if (
      path.includes('/node_modules/')
      || path.includes('/.git/')
      || path.includes('/.output/')
      || path.includes('/.nitro/')
      || path.includes('/.nuxt/')
      || path.includes('/.graphql/')
      || path.includes('/dist/')
    ) {
      return true
    }

    // Get the filename from the path
    const filename = path.split('/').pop() || ''

    // Allow directory traversal (paths without extensions in filename)
    // A file has an extension if the filename contains a dot
    if (!filename.includes('.') || path.endsWith('/')) {
      return false
    }

    // Only watch GraphQL-related files
    return !isWatchableFile(path)
  }
}

/**
 * Check if a path should be skipped (generated files)
 */
export function shouldSkipPath(path: string): boolean {
  return path.includes('/sdk.ts')
    || path.includes('/sdk.js')
    || path.endsWith('/config.ts')
}

/**
 * Create a core file watcher
 *
 * This is the shared watcher used by both Nitro and CLI.
 * Framework-specific actions are passed as callbacks.
 *
 * @example
 * ```typescript
 * // In Nitro
 * const watcher = createCoreWatcher(
 *   { watchDirs, serverDir: nitro.graphql.serverDir },
 *   {
 *     onServerChange: async () => {
 *       await performGraphQLScan(nitro, { silent: true, isRescan: true })
 *       await generateServerTypes(nitro, { silent: true })
 *       await nitro.hooks.callHook('dev:reload')
 *     },
 *     onClientChange: async () => {
 *       await generateClientTypes(nitro, { silent: true })
 *     },
 *   }
 * )
 *
 * // In CLI
 * const watcher = createCoreWatcher(
 *   { watchDirs, serverDir: ctx.config.serverDir },
 *   {
 *     onServerChange: async () => {
 *       await generateAll(ctx, { silent: true })
 *       await reloadHandler()
 *     },
 *     onClientChange: async () => {
 *       await generateClient(ctx, { silent: true })
 *     },
 *   }
 * )
 * ```
 */
export function createCoreWatcher(
  config: CoreWatcherConfig,
  callbacks: CoreWatcherCallbacks,
): FSWatcher {
  const {
    watchDirs,
    serverDir,
    debounceMs = 150,
    persistent = true,
    ignoreInitial = true,
    usePolling,
  } = config

  // Auto-enable polling in CI/test environments or when explicitly requested
  const shouldUsePolling = usePolling ?? (process.env.CI === 'true' || process.env.VITE_TEST === 'true')

  const watcher = watch(watchDirs, {
    persistent,
    ignoreInitial,
    ignored: createIgnoredFunction(),
    usePolling: shouldUsePolling,
    interval: shouldUsePolling ? 100 : undefined,
    // awaitWriteFinish helps with detecting file changes properly
    awaitWriteFinish: shouldUsePolling
      ? {
          stabilityThreshold: 100,
          pollInterval: 50,
        }
      : false,
  })

  // Track pending changes
  const pending = { server: false, client: false }

  // Process accumulated changes
  async function processChanges() {
    const changes = { ...pending }
    pending.server = pending.client = false

    try {
      if (changes.server) {
        await callbacks.onServerChange()
      }
      else if (changes.client) {
        await callbacks.onClientChange()
      }
    }
    catch (error) {
      callbacks.onError?.(error as Error)
    }
  }

  const debouncedProcess = debounce(processChanges, debounceMs)

  // Handle file events
  watcher.on('all', (_, path) => {
    // Skip generated files
    if (shouldSkipPath(path))
      return

    // Classify the change
    const changeType = classifyChange(path, serverDir)
    if (!changeType)
      return

    // Accumulate changes
    if (changeType === 'server') {
      pending.server = true
    }
    else {
      pending.client = true
    }

    debouncedProcess()
  })

  // Handle ready event
  if (callbacks.onReady) {
    watcher.on('ready', callbacks.onReady)
  }

  // Handle error event
  if (callbacks.onError) {
    watcher.on('error', callbacks.onError)
  }

  return watcher
}

/**
 * Close a watcher safely
 */
export async function closeWatcher(watcher: FSWatcher): Promise<void> {
  await watcher.close()
}
