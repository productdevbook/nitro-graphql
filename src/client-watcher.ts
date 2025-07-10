import type { Nitro } from 'nitropack/types'
import type { NitroGraphQLOptions } from './types'
import { mkdir, writeFile } from 'node:fs/promises'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { consola } from 'consola'
import { join } from 'pathe'
import { scanGraphQLFiles } from './scanner'
import { debounce } from './utils'

const logger = consola.withTag('graphql')

async function regenerateClientTypes(nitro: Nitro, options: NitroGraphQLOptions) {
  try {
    if (!options.client?.enabled)
      return

    // Regenerating client types silently

    // Get the server schema
    const scanResult = await scanGraphQLFiles(nitro)
    if (scanResult.typeDefs.length === 0) {
      logger.warn('⚠️  No server schema found for client type generation')
      return
    }

    const mergedTypeDefs = mergeTypeDefs(scanResult.typeDefs)
    const schema = makeExecutableSchema({
      typeDefs: mergedTypeDefs,
      resolvers: {},
    })

    // Client GraphQL file patterns
    const clientPatterns = options.client.watchPatterns || [
      join(nitro.options.srcDir, '**/*.graphql'),
      join(nitro.options.srcDir, '**/*.gql'),
      // Exclude server GraphQL files
      `!${join(nitro.options.srcDir, 'graphql/**/*')}`,
    ]

    // Generate client types using dynamic import
    const { generateClientTypes } = await import('./client-codegen')
    const generatedTypes = await generateClientTypes(
      schema,
      clientPatterns,
      options.client.config,
      options.client.outputPath,
    )

    if (generatedTypes) {
      const outputPath = options.client.outputPath
        || join(nitro.options.buildDir, 'types', 'graphql-client.generated.ts')

      const typesDir = join(nitro.options.buildDir, 'types')
      await mkdir(typesDir, { recursive: true })
      await writeFile(outputPath, generatedTypes)

      logger.success('✨ Client types updated')
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('❌ Client type generation failed:', errorMessage)
  }
}

export async function setupClientWatcher(nitro: Nitro, options: NitroGraphQLOptions) {
  if (!options.client?.enabled) {
    logger.info('🚫 Client type generation disabled')
    return
  }

  // Setting up client file watcher

  // Client GraphQL patterns
  const clientPatterns = options.client.watchPatterns || [
    join(nitro.options.srcDir, '**/*.graphql'),
    join(nitro.options.srcDir, '**/*.gql'),
  ]

  const generateClientTypesDebounced = debounce(async () => {
    await regenerateClientTypes(nitro, options)
  }, 300)

  const { watch } = await import('chokidar')
  const { globby } = await import('globby')

  // Find existing client GraphQL files
  const existingClientFiles = await globby(clientPatterns, {
    absolute: true,
    ignore: [join(nitro.options.srcDir, 'graphql/**/*')], // Exclude server files
  })

  // Client file watching setup complete

  const watchPatterns = existingClientFiles.length > 0 ? existingClientFiles : clientPatterns

  const watcher = watch(watchPatterns, {
    persistent: true,
    ignoreInitial: true,
    ignored: /(^|[/\\])\../,
    followSymlinks: false,
    depth: 10,
    usePolling: true,
    interval: 1000,
    binaryInterval: 1000,
  })

  watcher.on('change', (_path) => {
    generateClientTypesDebounced()
  })

  watcher.on('add', (_path) => {
    generateClientTypesDebounced()
  })

  watcher.on('unlink', (_path) => {
    generateClientTypesDebounced()
  })

  watcher.on('error', (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('❌ Client watcher error:', errorMessage)
  })

  nitro.hooks.hook('close', () => {
    logger.info('🔒 Closing client watcher')
    watcher.close()
  })

  // Generate initial types
  await generateClientTypesDebounced()

  logger.success('✅ Client watcher ready')
}
