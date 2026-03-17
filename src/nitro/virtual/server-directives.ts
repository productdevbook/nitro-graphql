/**
 * Virtual module: #nitro-graphql/server-directives
 * Generates import statements for all discovered directive files
 */

import type { Nitro } from 'nitro/types'
import { generateImportModule } from './utils'

export const serverDirectives = {
  id: '#nitro-graphql/server-directives',
  getCode: (nitro: Nitro): string => {
    const imports = nitro.scanDirectives || []
    if (!imports.length) {
      return 'export const directives = []'
    }
    return generateImportModule(imports, 'directives', 'directive')
  },
}
