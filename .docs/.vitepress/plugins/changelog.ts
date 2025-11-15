/**
 * Vite plugin to provide changelog data as virtual module
 */

import type { Plugin } from 'vite'
import type { ChangelogData } from '../../metadata/types'

export function ChangelogPlugin(data: ChangelogData): Plugin {
  const virtualModuleId = 'virtual:changelog'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'vitepress-plugin-changelog',

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
