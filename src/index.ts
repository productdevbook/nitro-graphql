import type { Nitro } from 'nitropack/types'
import type { NitroGraphQLOptions } from './types'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { watch } from 'chokidar'
import defu from 'defu'

import { defineNitroModule } from 'nitropack/kit'
import { dirname, join, resolve } from 'pathe'
import { rollupConfig } from './rollup'
import { relativeWithDot, scanDefs, scanResolvers } from './utils'
import { clientTypeGeneration, serverTypeGeneration } from './utils/server-type-generation'

export default defineNitroModule({
  name: 'nitro-graphql',
  async setup(nitro: Nitro) {
    nitro.graphql ||= {
      buildDir: '',
      watchDirs: [],
      clientDir: '',
    }

    nitro.options.runtimeConfig.graphql = defu(nitro.options.runtimeConfig.graphql || {}, {
      endpoint: {
        graphql: '/api/graphql',
        healthCheck: '/api/graphql/health',
      },
      playground: true,
    } as NitroGraphQLOptions)

    const graphqlBuildDir = resolve(nitro.options.buildDir, 'graphql')
    nitro.graphql.buildDir = graphqlBuildDir

    const watchDirs: string[] = []

    switch (nitro.options.framework.name) {
      case 'nuxt':
        watchDirs.push(join(nitro.options.rootDir, 'app', 'graphql'))
        nitro.graphql.clientDir = resolve(nitro.options.rootDir, 'app', 'graphql')
        break
      default:
    }

    const watcher = watch(watchDirs, {
      persistent: true,
      ignoreInitial: true,
      ignored: nitro.options.ignore,
    }).on('all', async (event, path) => {
      if (path.endsWith('.graphql') || path.endsWith('.gql')) {
        await clientTypeGeneration(nitro, path)
      }
    })

    nitro.hooks.hook('close', () => {
      watcher.close()
    })

    const tsConfigPath = resolve(
      nitro.options.buildDir,
      nitro.options.typescript.tsconfigPath,
    )
    const tsconfigDir = dirname(tsConfigPath)
    const typesDir = resolve(nitro.options.buildDir, 'types')

    const defs = await scanDefs(nitro)
    nitro.scanDefs = defs

    const resolvers = await scanResolvers(nitro)
    nitro.scanResolvers = resolvers

    nitro.hooks.hook('dev:start', async () => {
      const defs = await scanDefs(nitro)
      nitro.scanDefs = defs

      const resolvers = await scanResolvers(nitro)
      nitro.scanResolvers = resolvers
    })

    await rollupConfig(nitro)

    // Generate server and client types
    await serverTypeGeneration(nitro)
    await clientTypeGeneration(nitro, nitro.graphql.clientDir)

    const runtime = fileURLToPath(
      new URL('routes', import.meta.url),
    )
    // Main GraphQL endpoint
    nitro.options.handlers.push({
      route: nitro.options.runtimeConfig.graphql?.endpoint?.graphql || '/api/graphql',
      handler: join(runtime, 'graphql'),
      method: 'get',
    })

    // Main GraphQL endpoint
    nitro.options.handlers.push({
      route: nitro.options.runtimeConfig.graphql?.endpoint?.graphql || '/api/graphql',
      handler: join(runtime, 'graphql'),
      method: 'post',
    })

    nitro.options.handlers.push({
      route: nitro.options.runtimeConfig.graphql?.endpoint?.graphql || '/api/graphql',
      handler: join(runtime, 'graphql'),
      method: 'options',
    })

    // Health check endpoint
    nitro.options.handlers.push({
      route: nitro.options.runtimeConfig.graphql?.endpoint?.healthCheck || '/api/graphql/health',
      handler: join(runtime, 'health'),
      method: 'get',
    })

    // Auto-import utilities
    if (nitro.options.imports) {
      nitro.options.imports.presets.push({
        from: 'nitro-graphql/utils',
        imports: [
          'defineResolver',
          'defineYogaConfig',
        ],
      })
    }

    // Access the internal rollup config and add our prefix
    nitro.hooks.hook('rollup:before', (nitro, rollupConfig) => {
      const manualChunks = rollupConfig.output?.manualChunks
      const chunkFiles = rollupConfig.output?.chunkFileNames

      if (!rollupConfig.output.inlineDynamicImports) {
        rollupConfig.output.manualChunks = (id, meta) => {
          if (id.endsWith('.graphql') || id.endsWith('.gql')) {
            return 'schemas'
          }

          // resolsvers and defs are not in the same directory, so we need to check both
          if (id.endsWith('.resolver.ts')) {
            return 'resolvers'
          }

          if (typeof manualChunks === 'function') {
            return manualChunks(id, meta)
          }
          // If manualChunks is not a function, do not call it
          return undefined
        }
      }

      rollupConfig.output.chunkFileNames = (chunkInfo) => {
        // GraphQL dosyalarını kontrol et
        if (chunkInfo.moduleIds && chunkInfo.moduleIds.some(id =>
          id.includes('/graphql/') || id.includes('.graphql') || id.includes('.resolver.ts') || id.includes('.gql'),
        )) {
          return `chunks/graphql/[name].mjs`
        }

        // Use original logic for other chunks
        if (typeof chunkFiles === 'function') {
          return chunkFiles(chunkInfo)
        }

        // Unknown path
        return `chunks/_/[name].mjs`
      }
    })

    const graphqlDtsContent = `// Auto-generated by nitro-graphql
import type { Resolvers as Test } from './nitro-graphql-server.d.ts'

declare module 'nitro-graphql/types' {
  interface Resolvers extends Test {}
}
`

    writeFileSync(join(typesDir, 'graphql.d.ts'), graphqlDtsContent)

    nitro.hooks.hook('types:extend', (types) => {
      // Add TypeScript path alias for IDE support
      types.tsConfig ||= {}
      types.tsConfig.compilerOptions ??= {}
      types.tsConfig.compilerOptions.paths ??= {}
      types.tsConfig.compilerOptions.paths['#graphql/server'] = [
        relativeWithDot(tsconfigDir, join(typesDir, 'nitro-graphql-server.d.ts')),
      ]
      types.tsConfig.compilerOptions.paths['#graphql/client'] = [
        relativeWithDot(tsconfigDir, join(typesDir, 'nitro-graphql-client.d.ts')),
      ]
      types.tsConfig.include = types.tsConfig.include || []
      types.tsConfig.include.push(
        relativeWithDot(tsconfigDir, join(typesDir, 'nitro-graphql-server.d.ts')),
        relativeWithDot(tsconfigDir, join(typesDir, 'nitro-graphql-client.d.ts')),
        relativeWithDot(tsconfigDir, join(typesDir, 'graphql.d.ts')),
      )
    })
  },
})
