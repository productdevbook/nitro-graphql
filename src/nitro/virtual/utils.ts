/**
 * Shared utilities for virtual module generators
 */

import type { Nitro } from 'nitro/types'
import type { GenImport } from '../types'
import { genImport } from 'knitwork'

/**
 * Generate an import-based module that collects items into an exported array
 */
export function generateImportModule(
  items: GenImport[],
  exportName: string,
  wrapperKey: string,
): string {
  if (!items.length)
    return `export const ${exportName} = []`

  const imports = items.flatMap(({ specifier, imports: list, options }) =>
    list?.length ? [genImport(specifier, list, options)] : [],
  )
  const data = items.flatMap(({ imports: list }) =>
    list.map(i => `{ ${wrapperKey}: ${i.as || i.name} }`),
  )
  return `${imports.join('\n')}\n\nexport const ${exportName} = [\n${data.join(',\n')}\n]`
}

/**
 * Safely generate code from a registered virtual module
 * Used by debug-info to inspect other virtual modules
 */
export function safeGenerateModuleCode(nitro: Nitro, moduleName: string): string {
  try {
    const generator = nitro.options.virtual?.[moduleName]
    if (generator && typeof generator === 'function') {
      return generator() as string
    }
    return '// Module not found'
  }
  catch (error) {
    return `// Error: ${error instanceof Error ? error.message : String(error)}`
  }
}
