import type { VueTSConfig } from '@nuxt/schema'
import { defineNuxtModule } from '@nuxt/kit'
import { join, resolve } from 'pathe'

export interface ModuleOptions {

}

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
      dirs.push(resolve(nuxt.options.srcDir, 'graphql'))
    })
  },
})
