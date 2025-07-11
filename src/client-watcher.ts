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

    // Simple client patterns
    const getClientPatterns = () => {
      if (options.client?.watchPatterns) {
        return options.client.watchPatterns
      }

      const basePatterns = [
        join(nitro.options.srcDir, '**/*.graphql'),
        join(nitro.options.srcDir, '**/*.gql'),
        `!${join(nitro.options.srcDir, 'graphql/**/*')}`, // Exclude server files
      ]

      // Add Nuxt-specific patterns
      if (nitro.options.framework?.name === 'nuxt') {
        if (options.client?.nuxtPatterns) {
          basePatterns.unshift(...options.client.nuxtPatterns)
        }
        else {
          basePatterns.unshift(
            join(nitro.options.srcDir, 'app/graphql/**/*.graphql'),
            join(nitro.options.srcDir, 'app/graphql/**/*.gql'),
          )
        }
      }

      return basePatterns
    }

    const clientPatterns = getClientPatterns()

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

  // Simple client patterns
  const getClientPatterns = () => {
    if (options.client?.watchPatterns) {
      return options.client.watchPatterns
    }

    const basePatterns = [
      join(nitro.options.srcDir, '**/*.graphql'),
      join(nitro.options.srcDir, '**/*.gql'),
    ]

    // Add Nuxt-specific patterns
    if (nitro.options.framework?.name === 'nuxt') {
      if (options.client?.nuxtPatterns) {
        basePatterns.unshift(...options.client.nuxtPatterns)
      }
      else {
        basePatterns.unshift(
          join(nitro.options.srcDir, 'app/graphql/**/*.graphql'),
          join(nitro.options.srcDir, 'app/graphql/**/*.gql'),
        )
      }
    }

    return basePatterns
  }

  const clientPatterns = getClientPatterns()

  // Create debounced function
  const generateClientTypesDebounced = debounce(async () => {
    await regenerateClientTypes(nitro, options)
  }, 300)

  // Use chokidar directly
  const { watch } = await import('chokidar')

  const watcher = watch(clientPatterns, {
    persistent: true,
    ignoreInitial: true,
    ignored: [
      /(^|[/\\])\.\.\./, // ignore dotfiles
      join(nitro.options.srcDir, 'graphql/**/*'), // Exclude server files
    ],
    followSymlinks: false,
    usePolling: true,
    interval: 500,
    binaryInterval: 500,
  })

  // Simple event handlers
  watcher.on('add', (path) => {
    logger.info(`📁 Client file added: ${path}`)
    generateClientTypesDebounced()
  })

  watcher.on('change', (path) => {
    logger.info(`📝 Client file changed: ${path}`)
    generateClientTypesDebounced()
  })

  watcher.on('unlink', (path) => {
    logger.info(`🗑️ Client file removed: ${path}`)
    generateClientTypesDebounced()
  })

  watcher.on('error', (error) => {
    logger.error('❌ Client watcher error:', error)
  })

  // Cleanup
  nitro.hooks.hook('close', () => {
    logger.info('🔒 Closing client watcher')
    watcher.close()
  })

  // Generate initial types
  await regenerateClientTypes(nitro, options)

  logger.success('✅ Client watcher ready')
}
