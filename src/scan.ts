import type { Nitro } from 'nitropack'
import { join } from 'pathe'
import { graphQLLoadSchemaSync } from './client-codegen'

export async function scanSchema(nitro: Nitro) {
  const schema = await graphQLLoadSchemaSync(
    [join(nitro.options.srcDir, 'graphql', '**', '*.{graphql,gql}')],
    { cwd: nitro.options.rootDir },
  )

  return schema
}
