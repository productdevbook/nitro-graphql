/**
 * Virtual module: #nitro-graphql/validation-schemas
 * Merges local and extend validation schema files (schema.ts with Zod/Valibot)
 */

import type { Nitro } from 'nitro/types'
import { existsSync } from 'node:fs'
import { resolve } from 'pathe'

export const validationSchemas = {
  id: '#nitro-graphql/validation-schemas',
  getCode: (nitro: Nitro): string => {
    const localSchemaPath = resolve(nitro.graphql.serverDir, 'schema.ts')
    const extendSchemas = [...nitro.graphql.state.extendSchemas]
    const hasLocalSchema = existsSync(localSchemaPath)

    // No schemas at all - return empty object
    if (!hasLocalSchema && extendSchemas.length === 0) {
      return `const mergedSchemas = {}
export default mergedSchemas
`
    }

    // Build imports and merge statement
    const imports: string[] = []
    const schemaNames: string[] = []

    // Import extend schemas first (lower priority)
    extendSchemas.forEach((schemaPath, index) => {
      const schemaName = `extendSchema${index}`
      imports.push(`import ${schemaName} from '${schemaPath}'`)
      schemaNames.push(schemaName)
    })

    // Import local schema last (highest priority)
    if (hasLocalSchema) {
      imports.push(`import localSchema from '${localSchemaPath}'`)
      schemaNames.push('localSchema')
    }

    // Merge schemas with spread (later schemas override earlier ones)
    const mergeExpression = schemaNames.length === 1
      ? schemaNames[0]
      : `{ ${schemaNames.map(name => `...${name}`).join(', ')} }`

    return `${imports.join('\n')}

const mergedSchemas = ${mergeExpression}
export default mergedSchemas
`
  },
}
