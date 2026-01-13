/**
 * Generate command
 * Type generation for standalone CLI
 */

import type { ScanContext } from '../../core/types'
import type { CLIContext } from '../index'
import consola from 'consola'
import { dirname, join, relative, resolve } from 'pathe'
import {
  generateClientTypesCore,
  generateResolverModule,
  generateRuntimeIndex,
  generateSchemaModule,
  generateServerTypesCore,
  loadGraphQLDocuments,
} from '../../core/codegen'
import { LOG_TAG } from '../../core/constants'
import { scanDocumentsCore, scanResolversCore, scanSchemasCore } from '../../core/scanning'
import { buildGraphQLSchema } from '../../core/schema'
import { existsSync_, mkdirSync_, onSignal, readFileSync_, writeFileSync_ } from '../../core/utils/runtime'

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
  }
}

/**
 * Generate all types (server + client + optional runtime)
 */
export async function generateAll(
  ctx: CLIContext,
  options: { silent?: boolean, watch?: boolean, runtime?: boolean } = {},
): Promise<void> {
  await generateServer(ctx, options)
  await generateClient(ctx, options)

  // Generate runtime files if enabled
  if (options.runtime) {
    await generateRuntimeFiles(ctx, options)
  }

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

  // Generate types (cast codegen config as core expects simplified types)
  const serverConfig = ctx.config.codegen?.server as any
  const result = await generateServerTypesCore({
    framework: ctx.config.framework,
    schema,
    config: serverConfig,
    federationEnabled: ctx.config.federation?.enabled,
    skipValidationSchemas: serverConfig?.skipValidationSchemas ?? false,
  })

  // Write schema file
  const schemaPath = join(ctx.config.buildDir, 'schema.graphql')
  mkdirSync_(dirname(schemaPath))
  writeFileSync_(schemaPath, result.schemaString)

  // Determine types output path
  const typesConfig = ctx.config.types
  let typesPath: string

  if (typesConfig && typeof typesConfig === 'object' && typeof typesConfig.server === 'string') {
    // Use custom path from config
    typesPath = resolve(ctx.config.rootDir, typesConfig.server)
  }
  else {
    // Use default path
    typesPath = join(ctx.config.typesDir, 'nitro-graphql-server.d.ts')
  }

  // Write types file
  mkdirSync_(dirname(typesPath))
  writeFileSync_(typesPath, result.types)

  if (!options.silent) {
    logger.success(`Generated server types: ${relative(ctx.config.rootDir, typesPath)}`)
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
  if (!existsSync_(schemaPath)) {
    if (!options.silent) {
      logger.info('Server schema not found. Generate server types first.')
    }
    return
  }

  // Scan for documents (cast external services as core expects simplified types)
  const docsResult = await scanDocumentsCore(scanCtx, {
    externalServices: ctx.config.externalServices as any,
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
  const schemaString = readFileSync_(schemaPath)
  const schema = buildSchema(schemaString)

  // Generate types (cast codegen config as core expects simplified types)
  const result = await generateClientTypesCore({
    schema,
    documents,
    config: ctx.config.codegen?.client as any,
    sdkConfig: ctx.config.codegen?.clientSDK as any,
    options: { silent: options.silent },
  })

  if (result === false) {
    if (!options.silent) {
      logger.warn('Client type generation skipped')
    }
    return
  }

  // Determine types output path
  const typesConfig = ctx.config.types
  let typesPath: string

  if (typesConfig && typeof typesConfig === 'object' && typeof typesConfig.client === 'string') {
    // Use custom path from config
    typesPath = resolve(ctx.config.rootDir, typesConfig.client)
  }
  else {
    // Use default path
    typesPath = join(ctx.config.typesDir, 'nitro-graphql-client.d.ts')
  }

  // Write types file
  mkdirSync_(dirname(typesPath))
  writeFileSync_(typesPath, result.types)

  // Write SDK file
  const sdkPath = join(ctx.config.clientDir, 'default', 'sdk.ts')
  mkdirSync_(dirname(sdkPath))
  writeFileSync_(sdkPath, result.sdk)

  if (!options.silent) {
    logger.success(`Generated client types: ${relative(ctx.config.rootDir, typesPath)}`)
  }
}

/**
 * Generate runtime files (resolvers.ts, schema.ts, index.ts)
 */
async function generateRuntimeFiles(
  ctx: CLIContext,
  options: { silent?: boolean } = {},
): Promise<void> {
  const scanCtx = createScanContext(ctx)

  // Determine runtime output directory
  const runtimeConfig = ctx.config.runtime
  const runtimeDir = typeof runtimeConfig === 'object' && runtimeConfig.outDir
    ? join(ctx.config.rootDir, runtimeConfig.outDir)
    : join(ctx.config.buildDir, 'runtime')

  mkdirSync_(runtimeDir)

  // Check what to include
  const include = typeof runtimeConfig === 'object' && runtimeConfig.include
    ? runtimeConfig.include
    : { resolvers: true, schema: true, index: true }

  // Generate resolvers.ts
  if (include.resolvers !== false) {
    const resolversResult = await scanResolversCore(scanCtx)

    if (resolversResult.items.length > 0) {
      const resolverCode = generateResolverModule(resolversResult.items, runtimeDir)
      writeFileSync_(join(runtimeDir, 'resolvers.ts'), resolverCode)

      if (!options.silent) {
        logger.success(`Generated runtime: ${relative(ctx.config.rootDir, join(runtimeDir, 'resolvers.ts'))}`)
      }
    }
    else if (!options.silent) {
      logger.info('No resolvers found for runtime generation')
    }
  }

  // Generate schema.ts
  if (include.schema !== false) {
    const schemaPath = join(ctx.config.buildDir, 'schema.graphql')
    if (existsSync_(schemaPath)) {
      const schemaString = readFileSync_(schemaPath)
      const schemaCode = generateSchemaModule(schemaString)
      writeFileSync_(join(runtimeDir, 'schema.ts'), schemaCode)

      if (!options.silent) {
        logger.success(`Generated runtime: ${relative(ctx.config.rootDir, join(runtimeDir, 'schema.ts'))}`)
      }
    }
    else if (!options.silent) {
      logger.info('Schema not found for runtime generation. Run generate first.')
    }
  }

  // Generate index.ts
  if (include.index !== false) {
    const indexCode = generateRuntimeIndex()
    writeFileSync_(join(runtimeDir, 'index.ts'), indexCode)

    if (!options.silent) {
      logger.success(`Generated runtime: ${relative(ctx.config.rootDir, join(runtimeDir, 'index.ts'))}`)
    }
  }
}

/**
 * Watch mode - regenerate on file changes
 */
async function watchAndRegenerate(
  ctx: CLIContext,
  options: { silent?: boolean } = {},
): Promise<void> {
  const { watch } = await import('chokidar')

  // Watch directories directly for better compatibility
  const watchDirs = [
    ctx.config.serverDir,
    ctx.config.clientDir,
  ]

  const watcher = watch(watchDirs, {
    ignoreInitial: true,
    ignored: [
      ...ctx.config.ignore || [],
      /node_modules/,
      /\.git/,
    ],
    persistent: true,
  })

  // Wait for watcher to be ready
  await new Promise<void>((resolve) => {
    watcher.on('ready', resolve)
    watcher.on('error', error => logger.error('Watcher error:', error))
  })

  const relPath = (p: string) => relative(ctx.config.rootDir, p) || '.'
  logger.info(`Watching: ${watchDirs.map(relPath).join(', ')}`)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const debounceMs = ctx.config.watch?.debounce ?? 300

  watcher.on('all', (event, filePath) => {
    // Only handle graphql and resolver files
    if (!filePath.endsWith('.graphql') && !filePath.endsWith('.resolver.ts')) {
      return
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(async () => {
      try {
        await generateAll(ctx, { silent: options.silent ?? true, watch: false })
        logger.success(`Types regenerated (${relPath(filePath)})`)
      }
      catch (error) {
        logger.error('Regeneration failed:', error)
      }
    }, debounceMs)
  })

  // Keep process alive
  await new Promise<void>((resolvePromise) => {
    onSignal('SIGINT', () => {
      watcher.close()
      resolvePromise()
    })
  })
}
