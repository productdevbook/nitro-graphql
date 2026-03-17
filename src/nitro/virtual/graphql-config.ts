/**
 * Virtual module: #nitro-graphql/graphql-config
 * Merges local and extend GraphQL configuration files
 */

import type { Nitro } from 'nitro/types'
import { existsSync } from 'node:fs'
import { resolve } from 'pathe'

export const graphqlConfig = {
  id: '#nitro-graphql/graphql-config',
  getCode: (nitro: Nitro): string => {
    const localConfigPath = resolve(nitro.graphql.serverDir, 'config.ts')
    const extendConfigs = nitro.graphql.extendConfigs || []
    const hasLocalConfig = existsSync(localConfigPath)

    // No configs at all - return empty
    if (!hasLocalConfig && extendConfigs.length === 0) {
      return `const importedConfig = {}
export { importedConfig }
`
    }

    // Build imports and merge statement
    const imports: string[] = ['import { defu } from \'defu\'']
    const configNames: string[] = []

    // Import extend configs first (lower priority)
    extendConfigs.forEach((configPath, index) => {
      const configName = `extendConfig${index}`
      imports.push(`import ${configName} from '${configPath}'`)
      configNames.push(configName)
    })

    // Import local config last (highest priority)
    if (hasLocalConfig) {
      imports.push(`import localConfig from '${localConfigPath}'`)
      configNames.push('localConfig')
    }

    // Merge configs with defu (later configs have higher priority)
    // defu merges right-to-left, so we reverse to give local config highest priority
    const mergeArgs = configNames.reverse().join(', ')

    return `${imports.join('\n')}

const importedConfig = defu(${mergeArgs})
export { importedConfig }
`
  },
}
