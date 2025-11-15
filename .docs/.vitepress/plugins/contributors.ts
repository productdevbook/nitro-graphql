/**
 * Vite plugin to provide contributors data as virtual module
 */

import type { Plugin } from 'vite'
import type { ContributorsData } from '../../metadata/types'

export function ContributorsPlugin(data: ContributorsData): Plugin {
  const virtualModuleId = 'virtual:contributors'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'vitepress-plugin-contributors',

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
