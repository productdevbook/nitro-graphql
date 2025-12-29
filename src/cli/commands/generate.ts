/**
 * Generate command
 * Type generation for standalone CLI
 */

import type { ScanContext } from '../../core/types'
import type { CLIContext } from '../index'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import consola from 'consola'
import { dirname, join } from 'pathe'
import {
  generateClientTypesCore,
  generateServerTypesCore,
  loadGraphQLDocuments,
} from '../../core/codegen'
import { LOG_TAG } from '../../core/constants'
import {
  scanDocumentsCore,
  scanSchemasCore,
} from '../../core/scanning'
import { buildGraphQLSchema } from '../../core/schema'

const logger = consola.withTag(LOG_TAG)

/**
 * Create ScanContext from CLI context
 */
function createScanContext(ctx: CLIContext): ScanContext {
  return {
    rootDir: ctx.config.rootDir,
    serverDir: ctx.config.serverDir,
    clientDir: ctx.config.clientDir,
    ignorePatterns: ctx.config.ignore,
    isDev: false,
    logger: {
      info: (msg, ...args) => logger.info(msg, ...args),
      warn: (msg, ...args) => logger.warn(msg, ...args),
      error: (msg, ...args) => logger.error(msg, ...args),
      success: (msg, ...args) => logger.success(msg, ...args),
      debug: (msg, ...args) => logger.debug(msg, ...args),
    },
    layerServerDirs: [],
    layerAppDirs: [],
  }
}

/**
 * Generate all types (server + client)
 */
export async function generateAll(
  ctx: CLIContext,
  options: { silent?: boolean, watch?: boolean } = {},
): Promise<void> {
  await generateServer(ctx, options)
  await generateClient(ctx, options)

  if (options.watch) {
    await watchAndRegenerate(ctx, options)
  }
}

/**
 * Generate server types
 */
export async function generateServer(
  ctx: CLIContext,
  options: { silent?: boolean } = {},
): Promise<void> {
  const scanCtx = createScanContext(ctx)

  // Scan for schema files
  const schemaResult = await scanSchemasCore(scanCtx)

  if (schemaResult.errors.length > 0) {
    for (const error of schemaResult.errors) {
      logger.error(error)
    }
  }

  if (schemaResult.items.length === 0) {
    if (!options.silent) {
      logger.info('No GraphQL schemas found in server directory')
    }
    return
  }

  // Build schema from files
  const schema = await buildGraphQLSchema(schemaResult.items)
  if (!schema) {
    logger.error('Failed to build GraphQL schema')
    return
  }

  // Generate types
  const result = await generateServerTypesCore({
    framework: ctx.config.framework,
    schema,
    config: ctx.config.codegen?.server,
    federationEnabled: ctx.config.federation?.enabled,
  })

  // Write schema file
  const schemaPath = join(ctx.config.buildDir, 'schema.graphql')
  mkdirSync(dirname(schemaPath), { recursive: true })
  writeFileSync(schemaPath, result.schemaString, 'utf-8')

  // Write types file
  const typesPath = join(ctx.config.typesDir, 'nitro-graphql-server.d.ts')
  mkdirSync(dirname(typesPath), { recursive: true })
  writeFileSync(typesPath, result.types, 'utf-8')

  if (!options.silent) {
    logger.success(`Generated server types at: ${typesPath}`)
  }
}

/**
 * Generate client types
 */
export async function generateClient(
  ctx: CLIContext,
  options: { silent?: boolean } = {},
): Promise<void> {
  const scanCtx = createScanContext(ctx)

  // Check if schema exists
  const schemaPath = join(ctx.config.buildDir, 'schema.graphql')
  if (!existsSync(schemaPath)) {
    if (!options.silent) {
      logger.info('Server schema not found. Generate server types first.')
    }
    return
  }

  // Scan for documents
  const docsResult = await scanDocumentsCore(scanCtx, {
    externalServices: ctx.config.externalServices,
  })

  if (docsResult.errors.length > 0) {
    for (const error of docsResult.errors) {
      logger.error(error)
    }
  }

  if (docsResult.items.length === 0) {
    if (!options.silent) {
      logger.info('No GraphQL documents found in client directory')
    }
    return
  }

  // Load documents
  const documents = await loadGraphQLDocuments(docsResult.items)

  // Build schema from file
  const { buildSchema } = await import('graphql')
  const { readFileSync } = await import('node:fs')
  const schemaString = readFileSync(schemaPath, 'utf-8')
  const schema = buildSchema(schemaString)

  // Generate types
  const result = await generateClientTypesCore({
    schema,
    documents,
    config: ctx.config.codegen?.client,
    sdkConfig: ctx.config.codegen?.clientSDK,
    options: { silent: options.silent },
  })

  if (result === false) {
    if (!options.silent) {
      logger.warn('Client type generation skipped')
    }
    return
  }

  // Write types file
  const typesPath = join(ctx.config.typesDir, 'nitro-graphql-client.d.ts')
  mkdirSync(dirname(typesPath), { recursive: true })
  writeFileSync(typesPath, result.types, 'utf-8')

  // Write SDK file
  const sdkPath = join(ctx.config.clientDir, 'default', 'sdk.ts')
  mkdirSync(dirname(sdkPath), { recursive: true })
  writeFileSync(sdkPath, result.sdk, 'utf-8')

  if (!options.silent) {
    logger.success(`Generated client types at: ${typesPath}`)
  }
}

/**
 * Watch mode - regenerate on file changes
 */
async function watchAndRegenerate(
  ctx: CLIContext,
  options: { silent?: boolean } = {},
): Promise<void> {
  const chokidar = await import('chokidar')

  const watchPaths = [
    join(ctx.config.serverDir, '**/*.graphql'),
    join(ctx.config.serverDir, '**/*.resolver.ts'),
    join(ctx.config.clientDir, '**/*.graphql'),
  ]

  logger.info('Watching for changes...')

  const watcher = chokidar.watch(watchPaths, {
    ignoreInitial: true,
    ignored: ctx.config.ignore,
  })

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const debounceMs = ctx.config.watch?.debounce ?? 300

  watcher.on('all', (event, path) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(async () => {
      logger.info(`File changed: ${path}`)
      try {
        await generateAll(ctx, { ...options, watch: false })
      }
      catch (error) {
        logger.error('Regeneration failed:', error)
      }
    }, debounceMs)
  })

  // Keep process alive
  process.on('SIGINT', () => {
    watcher.close()
    process.exit(0)
  })
}
