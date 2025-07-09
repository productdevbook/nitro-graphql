import type { Nitro } from 'nitropack/types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { watch } from 'chokidar'
import { consola } from 'consola'
import { generateTypes } from './codegen'
import { debounce } from './utils/debounce'

export async function setupGraphQLWatcher(nitro: Nitro) {
  const graphqlDir = join(nitro.options.srcDir, 'graphql')
  const typeDefsPattern = join(graphqlDir, '**/*.graphql')
  const resolversPattern = join(graphqlDir, 'resolvers/**/*.{ts,js}')

  let currentTypeDefs: string[] = []
  let isGenerating = false

  const generateTypesDebounced = debounce(async () => {
    if (isGenerating)
      return
    isGenerating = true

    try {
      // Load all GraphQL files
      const graphqlFiles = loadFilesSync(typeDefsPattern, {
        recursive: true,
      })

      if (graphqlFiles.length === 0) {
        console.log('[nitro-graphql-yoga] No GraphQL files found')
        return
      }

      // Merge all type definitions
      const mergedTypeDefs = mergeTypeDefs(graphqlFiles)

      // Create schema
      const schema = makeExecutableSchema({
        typeDefs: mergedTypeDefs,
        resolvers: {}, // Empty resolvers for type generation
      })

      // Generate types
      const generatedTypes = await generateTypes(schema)

      // Write to file
      const outputPath = join(nitro.options.srcDir, 'graphql/types.generated.ts')
      await mkdir(join(nitro.options.srcDir, 'graphql'), { recursive: true })
      await writeFile(outputPath, generatedTypes)

      consola.success('[nitro-graphql-yoga] Types regenerated at:', outputPath)
    }
    catch (error) {
      console.error('[nitro-graphql-yoga] Error generating types:', error)
    }
    finally {
      isGenerating = false
    }
  }, 300)

  // Watch GraphQL files
  const watcher = watch([typeDefsPattern, resolversPattern], {
    persistent: true,
    ignoreInitial: false,
    depth: 10,
  })

  watcher.on('add', generateTypesDebounced)
  watcher.on('change', generateTypesDebounced)
  watcher.on('unlink', generateTypesDebounced)

  // Clean up on close
  nitro.hooks.hook('close', () => {
    watcher.close()
  })

  console.log('[nitro-graphql-yoga] Watching GraphQL files for changes...')
}
