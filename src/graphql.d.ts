import type { NitroConfig } from 'nitropack'
import type { NitroGraphQLOptions } from './types'

declare module 'nitropack' {
  interface NitroRuntimeHooks {

  }

  interface NitroRuntimeConfig {
  }
}

declare module 'nitropack/config' {
  function defineNitroConfig(config: NitroConfig & {
    graphql?: NitroGraphQLOptions
  }): NitroConfig
}
