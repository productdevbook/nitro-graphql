/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import type { VueTSConfig } from '@nuxt/schema'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { defineNuxtModule, getLayerDirectories } from '@nuxt/kit'
import { dirname, join, relative, resolve } from 'pathe'
import { getDefaultPaths, getTypesConfig, resolveFilePath } from './nitro/paths'

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
      // Create a mock Nitro-like object for path resolution
      const mockNitro = {
        options: {
          rootDir: nuxt.options.rootDir,
          buildDir: nuxt.options.buildDir,
          framework: { name: 'nuxt' as const },
          graphql: nuxt.options.nitro?.graphql,
        },
      } as any

      const placeholders = getDefaultPaths(mockNitro)
      const typesConfig = getTypesConfig(mockNitro)
      const tsconfigDir = dirname(join(nuxt.options.buildDir, 'tsconfig.json'))

      // Helper function to convert absolute path to relative with dot
      const relativeWithDot = (from: string, to: string): string => {
        const rel = relative(from, to)
        return rel.startsWith('.') ? rel : `./${rel}`
      }

      // Resolve client types path
      const clientTypesPath = resolveFilePath(
        typesConfig.client,
        typesConfig.enabled,
        true,
        '{typesDir}/nitro-graphql-client.d.ts',
        placeholders,
      )

      if (clientTypesPath) {
        const relativePath = relativeWithDot(tsconfigDir, clientTypesPath)
        options.references.push({ path: relativePath })

        options.tsConfig ??= {} as VueTSConfig
        options.tsConfig.compilerOptions ??= {}
        options.tsConfig.compilerOptions.paths ??= {}
        options.tsConfig.compilerOptions.paths['#graphql/client'] = [relativePath]

        options.tsConfig.include = options.tsConfig.include || []
        options.tsConfig.include.push(relativePath)
      }

      // Add external services types with proper path resolution
      const externalServices = nuxt.options.nitro?.graphql?.externalServices || []
      for (const service of externalServices) {
        const servicePlaceholders = {
          ...placeholders,
          serviceName: service.name,
        }

        // Resolve external service types path with service-specific override
        const externalTypesPath = resolveFilePath(
          service.paths?.types ?? typesConfig.external,
          typesConfig.enabled,
          true,
          '{typesDir}/nitro-graphql-client-{serviceName}.d.ts',
          servicePlaceholders,
        )

        if (externalTypesPath) {
          const relativePath = relativeWithDot(tsconfigDir, externalTypesPath)
          options.references.push({ path: relativePath })
          if (options.tsConfig.compilerOptions)
            options.tsConfig.compilerOptions.paths[`#graphql/client/${service.name}`] = [relativePath]
          if (options.tsConfig.include)
            options.tsConfig.include.push(relativePath)
        }
      }
    })

    // Add Vite/webpack alias for runtime resolution
    // Note: Aliases are resolved during prepare:types hook above using path-resolver
    // These are fallback aliases for runtime module resolution
    nuxt.options.alias = nuxt.options.alias || {}

    // Create mock Nitro for path resolution in alias setup
    const mockNitro = {
      options: {
        rootDir: nuxt.options.rootDir,
        buildDir: nuxt.options.buildDir,
        framework: { name: 'nuxt' as const },
        graphql: nuxt.options.nitro?.graphql,
      },
    } as any

    const placeholders = getDefaultPaths(mockNitro)
    const typesConfig = getTypesConfig(mockNitro)

    // Resolve client types path for alias
    const clientTypesPath = resolveFilePath(
      typesConfig.client,
      typesConfig.enabled,
      true,
      '{typesDir}/nitro-graphql-client.d.ts',
      placeholders,
    )
    if (clientTypesPath) {
      nuxt.options.alias['#graphql/client'] = clientTypesPath
    }

    // Add aliases for external services with proper path resolution
    const externalServices = nuxt.options.nitro?.graphql?.externalServices || []
    for (const service of externalServices) {
      const servicePlaceholders = {
        ...placeholders,
        serviceName: service.name,
      }

      const externalTypesPath = resolveFilePath(
        service.paths?.types ?? typesConfig.external,
        typesConfig.enabled,
        true,
        '{typesDir}/nitro-graphql-client-{serviceName}.d.ts',
        servicePlaceholders,
      )

      if (externalTypesPath) {
        nuxt.options.alias[`#graphql/client/${service.name}`] = externalTypesPath
      }
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

      // Convert Nuxt layers to extend entries (LocalDirExtendSource format)
      const layerExtends = layerDirs
        .filter((layer: any) => layer.root !== `${nuxt.options.rootDir}/`) // Exclude main project
        .map((layer: any) => {
          const serverDir = layer.server?.replace(/\/$/, '')
          const appDir = layer.app?.replace(/\/$/, '')
          // Only return if at least one graphql dir exists
          if (!serverDir && !appDir)
            return null
          return {
            serverDir: serverDir ? join(serverDir, 'graphql') : undefined,
            clientDir: appDir ? join(appDir, 'graphql') : undefined,
          }
        })
        .filter(Boolean) // Remove null entries

      // Initialize graphql config and add layer extends
      if (!nitroConfig.graphql) {
        nitroConfig.graphql = {} as any
      }
      nitroConfig.graphql!.extend = [
        ...(nitroConfig.graphql?.extend || []),
        ...layerExtends,
      ]

      // Check if app/graphql directory exists - use default app directory
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
