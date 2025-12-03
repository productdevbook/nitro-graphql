/**
 * Virtual module generator for #nitro-graphql/server-resolvers
 * Generates code that imports and exports all resolver files
 */

import type { Nitro } from 'nitro/types'
import { genImport } from 'knitwork'

/**
 * Generate virtual module code for server resolvers
 */
export function generateResolversModule(nitro: Nitro): string {
  try {
    const imports = [...nitro.scanResolvers]

    if (imports.length === 0) {
      if (nitro.options.dev) {
        nitro.logger.warn('[nitro-graphql] No resolvers found. Virtual module will export empty array.')
      }
      return 'export const resolvers = []'
    }

    const importsContent: string[] = []
    const invalidImports: string[] = []

    for (const { specifier, imports: importList, options } of imports) {
      try {
        // Validate import structure
        if (!importList || importList.length === 0) {
          invalidImports.push(`${specifier}: No exports found`)
          continue
        }

        // Generate import statement
        const importCode = genImport(specifier, importList, options)
        importsContent.push(importCode)
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        invalidImports.push(`${specifier}: ${message}`)
        if (nitro.options.dev) {
          nitro.logger.error(`[nitro-graphql] Failed to generate import for ${specifier}:`, error)
        }
      }
    }

    // Show warnings for invalid imports
    if (invalidImports.length > 0 && nitro.options.dev) {
      nitro.logger.warn('[nitro-graphql] Some resolver imports could not be generated:')
      for (const msg of invalidImports) {
        nitro.logger.warn(`  - ${msg}`)
      }
    }

    const data = imports
      .map(({ imports: importList }) =>
        importList.map(i => `{ resolver: ${i.as} }`).join(',\n'),
      )
      .filter(Boolean)
      .join(',\n')

    const content = [
      ...importsContent,
      '',
      'export const resolvers = [',
      data,
      ']',
      '',
    ]

    const code = content.join('\n')

    return code
  }
  catch (error) {
    nitro.logger.error('[nitro-graphql] Failed to generate virtual resolver module:', error)
    // Return empty module to prevent build failure
    return 'export const resolvers = []'
  }
}

/**
 * Register the resolvers virtual module with Nitro
 */
export function virtualResolvers(nitro: Nitro): void {
  nitro.options.virtual ??= {}
  nitro.options.virtual['#nitro-graphql/server-resolvers'] = () => generateResolversModule(nitro)
}
