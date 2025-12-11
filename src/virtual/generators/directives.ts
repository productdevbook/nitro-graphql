/**
 * Virtual module generator for #nitro-graphql/server-directives
 * Generates code that imports and exports all directive files
 */

import type { Nitro } from 'nitro/types'
import { genImport } from 'knitwork'

/**
 * Generate virtual module code for server directives
 */
export function generateDirectivesModule(nitro: Nitro): string {
  try {
    const imports = nitro.scanDirectives || []

    if (imports.length === 0) {
      // Directives are optional, no warning needed
      return 'export const directives = []'
    }

    const importsContent: string[] = []
    const invalidImports: string[] = []

    for (const { specifier, imports: importList, options } of imports) {
      try {
        if (!importList || importList.length === 0) {
          invalidImports.push(`${specifier}: No exports found`)
          continue
        }

        const importCode = genImport(specifier, importList, options)
        importsContent.push(importCode)
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        invalidImports.push(`${specifier}: ${message}`)
        if (nitro.options.dev) {
          nitro.logger.error(`[nitro-graphql] Failed to generate import for directive ${specifier}:`, error)
        }
      }
    }

    if (invalidImports.length > 0 && nitro.options.dev) {
      nitro.logger.warn('[nitro-graphql] Some directive imports could not be generated:')
      for (const msg of invalidImports) {
        nitro.logger.warn(`  - ${msg}`)
      }
    }

    const data = imports
      .map(({ imports: importList }) =>
        importList.map(i => `{ directive: ${i.as} }`).join(',\n'),
      )
      .filter(Boolean)
      .join(',\n')

    const content = [
      ...importsContent,
      '',
      'export const directives = [',
      data,
      ']',
      '',
    ]

    const code = content.join('\n')

    return code
  }
  catch (error) {
    nitro.logger.error('[nitro-graphql] Failed to generate virtual directive module:', error)
    return 'export const directives = []'
  }
}

/**
 * Register the directives virtual module with Nitro
 */
export function virtualDirectives(nitro: Nitro): void {
  nitro.options.virtual ??= {}
  nitro.options.virtual['#nitro-graphql/server-directives'] = () => generateDirectivesModule(nitro)
}
