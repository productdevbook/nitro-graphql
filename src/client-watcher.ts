import type { Nitro } from 'nitropack/types'
import type { NitroGraphQLYogaOptions } from './types'
import { mkdir, writeFile } from 'node:fs/promises'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { consola } from 'consola'
import { join } from 'pathe'
import { generateClientTypes } from './client-codegen'
import { scanGraphQLFiles } from './scanner'
import { debounce } from './utils'

async function regenerateClientTypes(nitro: Nitro, options: NitroGraphQLYogaOptions) {
  try {
    if (!options.client?.enabled)
      return

    consola.start('[graphql] 🔄 Regenerating client types...')

    // Get the server schema
    const scanResult = await scanGraphQLFiles(nitro)
    if (scanResult.typeDefs.length === 0) {
      consola.warn('[graphql] ⚠️  No server schema found for client type generation')
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

    // Generate client types
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

      consola.success('[graphql] ✨ Client types updated at:', outputPath)
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    consola.error('[graphql] ❌ Client type generation failed:', errorMessage)
  }
}

export async function setupClientWatcher(nitro: Nitro, options: NitroGraphQLYogaOptions) {
  if (!options.client?.enabled) {
    consola.info('[graphql] 🚫 Client type generation disabled')
    return
  }

  consola.info('[graphql] 🔧 Setting up client file watcher...')

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

  if (existingClientFiles.length > 0) {
    consola.info(`[graphql] 📁 Watching ${existingClientFiles.length} client GraphQL files`)
  }
  else {
    consola.info('[graphql] 📁 No client GraphQL files found to watch')
  }

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

  watcher.on('ready', () => {
    consola.ready('[graphql] 👁️  Client watcher ready')
  })

  watcher.on('change', (path) => {
    const fileName = path.split('/').pop()
    consola.info(`[graphql] 📝 Client file changed: ${fileName}`)
    generateClientTypesDebounced()
  })

  watcher.on('add', (path) => {
    const fileName = path.split('/').pop()
    consola.info(`[graphql] ➕ Client file added: ${fileName}`)
    generateClientTypesDebounced()
  })

  watcher.on('unlink', (path) => {
    const fileName = path.split('/').pop()
    consola.info(`[graphql] ➖ Client file removed: ${fileName}`)
    generateClientTypesDebounced()
  })

  watcher.on('error', (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    consola.error('[graphql] ❌ Client watcher error:', errorMessage)
  })

  nitro.hooks.hook('close', () => {
    consola.info('[graphql] 🔒 Closing client watcher')
    watcher.close()
  })

  // Generate initial types
  await generateClientTypesDebounced()

  consola.success('[graphql] ✅ Client watcher ready')
}
