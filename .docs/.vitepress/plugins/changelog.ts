/**
 * Vite plugin to provide changelog data as virtual module
 * Loads data lazily at build time to ensure metadata is generated first
 */

import type { Plugin } from 'vite'
import type { ChangelogData } from '../../metadata/types'
import { readFileSync, existsSync } from 'node:fs'

export function ChangelogPlugin(filePath: string): Plugin {
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
        // Load data lazily at build time
        let data: ChangelogData = {}

        if (existsSync(filePath)) {
          try {
            data = JSON.parse(readFileSync(filePath, 'utf-8'))
          } catch (error) {
            console.warn(`Failed to load changelog data from ${filePath}:`, error)
          }
        } else {
          console.warn(`Changelog data file not found at ${filePath}. Run metadata update script first.`)
        }

        return `export default ${JSON.stringify(data, null, 2)}`
      }
    },
  }
}
