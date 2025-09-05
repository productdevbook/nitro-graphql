import type { VueTSConfig } from '@nuxt/schema'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { defineNuxtModule, getLayerDirectories } from '@nuxt/kit'
import { join, resolve } from 'pathe'

export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nitro-graphql-nuxt',
    configKey: 'nitro-graphql-nuxt',
    compatibility: {
      nuxt: '>=3.16.0',
    },
  },
  setup: async (_options, nuxt) => {
    nuxt.hooks.hook('prepare:types', (options) => {
      options.references.push({ path: 'types/nitro-graphql-client.d.ts' })

      options.tsConfig ??= {} as VueTSConfig
      options.tsConfig.compilerOptions ??= {}
      options.tsConfig.compilerOptions.paths ??= {}
      options.tsConfig.compilerOptions.paths['#graphql/client'] = [
        './types/nitro-graphql-client.d.ts',
      ]

      // Add external services types
      const externalServices = nuxt.options.nitro?.graphql?.externalServices || []
      for (const service of externalServices) {
        options.references.push({ path: `types/nitro-graphql-client-${service.name}.d.ts` })
        options.tsConfig.compilerOptions.paths[`#graphql/client/${service.name}`] = [
          `./types/nitro-graphql-client-${service.name}.d.ts`,
        ]
      }

      options.tsConfig.include = options.tsConfig.include || []
      options.tsConfig.include.push('./types/nitro-graphql-client.d.ts')

      // Add external service type files to include
      for (const service of externalServices) {
        options.tsConfig.include.push(`./types/nitro-graphql-client-${service.name}.d.ts`)
      }
    })

    // Add Vite/webpack alias for runtime resolution
    nuxt.options.alias = nuxt.options.alias || {}
    nuxt.options.alias['#graphql/client'] = join(nuxt.options.buildDir, 'types/nitro-graphql-client.d.ts')

    // Add aliases for external services
    const externalServices = nuxt.options.nitro?.graphql?.externalServices || []
    for (const service of externalServices) {
      nuxt.options.alias[`#graphql/client/${service.name}`] = join(nuxt.options.buildDir, `types/nitro-graphql-client-${service.name}.d.ts`)
    }

    nuxt.hook('imports:dirs', (dirs) => {
      // Use Nuxt's Nitro GraphQL config to determine server directory
      const graphqlServerPath = nuxt.options.nitro?.graphql?.serverDir
        || resolve(nuxt.options.srcDir, 'graphql')
      dirs.push(graphqlServerPath)
    })

    // Handle Nuxt-specific GraphQL setup
    nuxt.hook('nitro:config', async (nitroConfig) => {
      const clientDir = join(nuxt.options.buildDir, 'graphql')

      // Collect layer directories using official Nuxt Kit utility
      const layerDirs = await getLayerDirectories(nuxt)

      const layerDirectories = layerDirs
        .map((layer: any) => layer.root.replace(/\/$/, '')) // Remove trailing slash
        .filter((root: string) => root !== nuxt.options.rootDir) // Exclude main project root

      // Also collect server directories for layers
      const layerServerDirs = layerDirs
        .filter((layer: any) => layer.root !== `${nuxt.options.rootDir}/`) // Exclude main project
        .map((layer: any) => layer.server?.replace(/\/$/, '')) // Remove trailing slash
        .filter(Boolean) // Remove undefined values

      // Also collect app directories for layers
      const layerAppDirs = layerDirs
        .filter((layer: any) => layer.root !== `${nuxt.options.rootDir}/`) // Exclude main project
        .map((layer: any) => layer.app?.replace(/\/$/, '')) // Remove trailing slash
        .filter(Boolean) // Remove undefined values

      // Pass layer information to Nitro config
      if (!nitroConfig.graphql) {
        nitroConfig.graphql = {} as any
      }
      nitroConfig.graphql!.layerDirectories = layerDirectories
      nitroConfig.graphql!.layerServerDirs = layerServerDirs
      nitroConfig.graphql!.layerAppDirs = layerAppDirs

      // Check if app/graphql directory exists
      const appGraphqlDir = resolve(nuxt.options.rootDir, 'app/graphql')
      const hasAppGraphqlDir = existsSync(appGraphqlDir)

      // Only create default setup if app/graphql directory doesn't exist
      if (!hasAppGraphqlDir) {
        // Create default subdirectory for the new folder structure
        const defaultDir = join(clientDir, 'default')
        if (!existsSync(defaultDir)) {
          mkdirSync(defaultDir, { recursive: true })
        }

        // Create a sample GraphQL query file to help users get started
        const sampleQueryFile = join(defaultDir, 'queries.graphql')
        if (!existsSync(sampleQueryFile)) {
          writeFileSync(sampleQueryFile, `# Example GraphQL queries
# Add your GraphQL queries here

# query GetUser($id: ID!) {
#   user(id: $id) {
#     id
#     name
#     email
#   }
# }
`, 'utf-8')
        }
      }
    })
  },
})
