/**
 * File watching and hot module reload for GraphQL files
 */

import type { FSWatcher } from 'chokidar'
import type { Nitro } from 'nitro/types'
import { existsSync, writeFileSync, readFileSync } from 'node:fs'
import { watch } from 'chokidar'
import consola from 'consola'
import { join, resolve } from 'pathe'
import {
  DIR_SERVER_GRAPHQL,
  DIR_SERVER_GRAPHQL_WIN,
  DIRECTIVE_EXTENSIONS,
  GRAPHQL_EXTENSIONS,
  LOG_TAG,
  RESOLVER_EXTENSIONS,
} from '../../core/constants'
import { generateDirectiveSchemas } from '../../core/utils/directive-parser'
import { NitroAdapter } from '../adapter'
import { generateClientTypes, generateServerTypes } from '../codegen'
import { resolveExtendConfig } from './extend-loader'
import {
  DEFAULT_WATCHER_IGNORE_INITIAL,
  DEFAULT_WATCHER_PERSISTENT,
} from '../config'

const logger = consola.withTag(LOG_TAG)

/**
 * Touch config.ts to trigger Rolldown's file watcher
 * This is needed because Rolldown doesn't detect changes to .graphql files in external packages
 */
function triggerRolldownRebuild(nitro: Nitro): void {
  const configPath = resolve(nitro.graphql.serverDir, 'config.ts')
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8')
      // Add/update a timestamp comment at the end to trigger change detection
      const timestampComment = `// HMR trigger: ${Date.now()}`
      const newContent = content.replace(/\/\/ HMR trigger: \d+\n?$/, '') + '\n' + timestampComment + '\n'
      writeFileSync(configPath, newContent)
    }
    catch {
      // Ignore errors - this is just a trigger mechanism
    }
  }
}

/**
 * Setup file watcher for GraphQL files (schemas, resolvers, directives, documents)
 * Watches for changes and triggers type regeneration and dev server reload
 */
export function setupFileWatcher(nitro: Nitro, watchDirs: string[]): FSWatcher {
  const watcher = watch(watchDirs, {
    persistent: DEFAULT_WATCHER_PERSISTENT,
    ignoreInitial: DEFAULT_WATCHER_IGNORE_INITIAL,
    ignored: nitro.options.ignore,
  })

  watcher.on('all', async (_, path) => {
    // Skip generated files to prevent infinite loops
    if (path.includes('/sdk.ts') || path.includes('/sdk.js') || path.endsWith('/config.ts')) {
      return
    }

    const isGraphQLFile = GRAPHQL_EXTENSIONS.some(ext => path.endsWith(ext))
    const isResolverFile = RESOLVER_EXTENSIONS.some(ext => path.endsWith(ext))
    const isDirectiveFile = DIRECTIVE_EXTENSIONS.some(ext => path.endsWith(ext))

    if (isGraphQLFile || isResolverFile || isDirectiveFile) {
      // Determine if this is a server or client file
      const isServerFile = path.includes(nitro.graphql.serverDir)
        || path.includes(DIR_SERVER_GRAPHQL)
        || path.includes(DIR_SERVER_GRAPHQL_WIN)

      if (isServerFile || isResolverFile || isDirectiveFile) {
        // Server GraphQL/resolver/directive file changed - rescan and reload
        // Step 1: Scan directives FIRST
        const directivesResult = await NitroAdapter.scanDirectives(nitro)
        nitro.scanDirectives = directivesResult.items

        // Step 2: Regenerate directive schemas and get path
        if (!nitro.scanSchemas) {
          nitro.scanSchemas = []
        }
        const directivesPath = await generateDirectiveSchemas(nitro, directivesResult.items)

        // Step 3: Rescan schemas from server directory
        const schemasResult = await NitroAdapter.scanSchemas(nitro)
        const schemas = schemasResult.items

        // Step 4: Add generated _directives.graphql to schemas if it exists
        if (directivesPath && !schemas.includes(directivesPath)) {
          schemas.push(directivesPath)
        }
        nitro.scanSchemas = schemas

        // Step 5: Rescan resolvers
        const resolversResult = await NitroAdapter.scanResolvers(nitro)
        nitro.scanResolvers = resolversResult.items

        // Step 6: Re-resolve extend config to add manifest files
        // (silent mode - dev:start will log when Nitro restarts)
        await resolveExtendConfig(nitro, { silent: true })

        logger.success('Types regenerated')
        await generateServerTypes(nitro, { silent: true })
        await generateClientTypes(nitro, { silent: true })

        // For .graphql files, trigger Rolldown rebuild by touching config.ts
        // (Rolldown doesn't detect .graphql changes in external/symlinked packages)
        if (isGraphQLFile) {
          triggerRolldownRebuild(nitro)
        }

        // Trigger Nitro reload to pick up changes
        await nitro.hooks.callHook('dev:reload')
      }
      else {
        // Client GraphQL file changed - only regenerate client types
        logger.success('Types regenerated')
        await generateClientTypes(nitro, { silent: true })
      }
    }
  })

  return watcher
}

/**
 * Determine which directories to watch based on framework and configuration
 */
export function getWatchDirectories(nitro: Nitro, extendDirs: string[] = []): string[] {
  const watchDirs: string[] = []
  const framework = nitro.options.framework.name

  switch (framework) {
    case 'nuxt': {
      // Watch client directory
      watchDirs.push(nitro.graphql.clientDir)

      // Add layer directories to watch list
      const layerServerDirs = nitro.options.graphql?.layerServerDirs || []
      const layerAppDirs = nitro.options.graphql?.layerAppDirs || []

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
      // Watch both client and server directories
      watchDirs.push(nitro.graphql.clientDir)
      watchDirs.push(nitro.graphql.serverDir)
      break
    default:
      // Unknown framework - watch both directories as fallback
      watchDirs.push(nitro.graphql.clientDir)
      watchDirs.push(nitro.graphql.serverDir)
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
