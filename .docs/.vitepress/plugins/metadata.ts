/**
 * Vite plugin to provide metadata index as virtual module
 */

import type { Plugin } from 'vite'
import type { MetadataIndex } from '../../metadata/types'

export function MetadataPlugin(data: MetadataIndex): Plugin {
  const virtualModuleId = 'virtual:metadata'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'vitepress-plugin-metadata',

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },

    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `export default ${JSON.stringify(data, null, 2)}`
      }
    },
  }
}
