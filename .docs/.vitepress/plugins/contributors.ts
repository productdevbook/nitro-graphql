/**
 * Vite plugin to provide contributors data as virtual module
 * Loads data lazily at build time to ensure metadata is generated first
 */

import type { Plugin } from 'vite'
import type { ContributorsData } from '../../metadata/types'
import { readFileSync, existsSync } from 'node:fs'

export function ContributorsPlugin(filePath: string): Plugin {
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
        // Load data lazily at build time
        let data: ContributorsData = {}

        if (existsSync(filePath)) {
          try {
            data = JSON.parse(readFileSync(filePath, 'utf-8'))
          } catch (error) {
            console.warn(`Failed to load contributors data from ${filePath}:`, error)
          }
        } else {
          console.warn(`Contributors data file not found at ${filePath}. Run metadata update script first.`)
        }

        return `export default ${JSON.stringify(data, null, 2)}`
      }
    },
  }
}
