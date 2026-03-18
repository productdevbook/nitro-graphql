/**
 * Virtual module: #nitro-graphql/module-config
 * Serializes the full module configuration for runtime access
 */

import type { Nitro } from 'nitro/types'

export const moduleConfig = {
  id: '#nitro-graphql/module-config',
  getCode: (nitro: Nitro): string => {
    const config = nitro.options.graphql || {}
    return `export const moduleConfig = ${JSON.stringify(config, null, 2)};`
  },
}
