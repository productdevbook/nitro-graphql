import type { VueTSConfig } from '@nuxt/schema'
import { addImportsDir, defineNuxtModule } from '@nuxt/kit'
import { join } from 'pathe'

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
  defaults: {},
  setup: (options, nuxt) => {
    nuxt.hooks.hook('prepare:types', (options) => {
      options.references.push({ path: 'types/nitro-graphql-client.d.ts' })

      options.tsConfig ??= {} as VueTSConfig
      options.tsConfig.compilerOptions ??= {}
      options.tsConfig.compilerOptions.paths ??= {}
      options.tsConfig.compilerOptions.paths['#graphql/client'] = [
        './types/nitro-graphql-client.d.ts',
      ]
      options.tsConfig.include = options.tsConfig.include || []
      options.tsConfig.include.push('./types/nitro-graphql-client.d.ts')
    })

    // Add Vite/webpack alias for runtime resolution
    nuxt.options.alias = nuxt.options.alias || {}
    nuxt.options.alias['#graphql/client'] = join(nuxt.options.buildDir, 'types/nitro-graphql-client.d.ts')

    addImportsDir(join(nuxt.options.srcDir, 'graphql'))
  },
})
