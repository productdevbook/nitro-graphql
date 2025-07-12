import type { Nitro } from 'nitropack'

import { writeFileSync } from 'node:fs'
import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'
import consola from 'consola'
import { buildASTSchema } from 'graphql'
import { resolve } from 'pathe'
import { generateTypes } from '../codegen'

export async function serverTypeGeneration(app: Nitro) {
  try {
    const defs = app.scanDefs || []
    const loadDefs = loadFilesSync(defs)
    const mergedDefs = mergeTypeDefs(loadDefs)

    const schema = buildASTSchema(mergedDefs, {
      assumeValidSDL: true,
      assumeValid: true,
    })

    const data = await generateTypes(schema)

    writeFileSync(resolve(app.options.buildDir, 'types', 'nitro-graphql-server.d.ts'), data, 'utf-8')
  }
  catch (error) {
    consola.error('Server schema generation error:', error)
  }
}
