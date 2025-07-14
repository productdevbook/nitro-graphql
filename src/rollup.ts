import type { Nitro } from 'nitropack'

import { readFile } from 'node:fs/promises'
import { parse } from 'graphql'
import { genImport } from 'knitwork'
import { getImportId, scanGraphql } from './utils'
import { serverTypeGeneration } from './utils/server-type-generation'

export async function rollupConfig(app: Nitro) {
  virtualDefs(app)
  virtualResolvers(app)

  app.hooks.hook('rollup:before', (nitro, rollupConfig) => {
    rollupConfig.plugins = rollupConfig.plugins || []
    const {
      include = /\.(graphql|gql)$/i,
      exclude,
      validate = false,
    } = app.options.graphql?.loader || {}

    if (Array.isArray(rollupConfig.plugins)) {
      rollupConfig.plugins.push({
        name: 'nitro-graphql',

        async load(id) {
          if (exclude?.test?.(id))
            return null
          if (!include.test(id))
            return null

          try {
            const content = await readFile(id, 'utf-8')

            // Optional: GraphQL syntax validation
            if (validate) {
              parse(content) // Throws an error if invalid
            }

            return `export default ${JSON.stringify(content)}`
          }
          catch (error) {
            // Dosya okuma hatası vs
            if ((error as any).code === 'ENOENT') {
              return null // Dosya bulunamazsa sessizce geç
            }
            this.error(`Failed to read GraphQL file ${id}: ${(error as any).message}`)
          }
        },
      })

      rollupConfig.plugins.push({
        name: 'nitro-graphql-watcher',
        async buildStart() {
          const graphqlFiles = await scanGraphql(nitro)
          // const clientGraphqlFiles = await scanClient(nitro)

          for (const file of graphqlFiles) {
            this.addWatchFile(file)
          }

          // for (const file of clientGraphqlFiles) {
          //   this.addWatchFile(file)
          // }

          // 2. Directory watching (partial çalışır)
          this.addWatchFile('server/graphql/')

          // 3. Client GraphQL files
          // if (app.options.framework.name === 'nuxt') {
          //   this.addWatchFile('app/graphql/')
          // }
        },
      })
    }
  })

  app.hooks.hook('dev:reload', async () => {
    await serverTypeGeneration(app)
  })
}

export function virtualDefs(app: Nitro) {
  const getDefs = () => {
    const defs: string[] = [
      ...app.scanDefs,
      ...(app.options.graphql?.typedefs ?? []),
    ]

    return defs
  }

  app.options.virtual ??= {}
  app.options.virtual['#nitro-internal-virtual/server-defs'] = () => {
    const imports = getDefs()

    const code = /* js */`
${imports
  .map(handler => `import ${getImportId(handler)} from '${handler}';`)
  .join('\n')}

export const defs = [
${imports
  .map(
    h =>
      /* js */ `{ def: ${getImportId(h)} }`,
  )
  .join(',\n')}
];
    `

    return code
  }
}

export function virtualResolvers(app: Nitro) {
  const getResolvers = () => {
    const resolvers = [
      ...app.scanResolvers,
      // ...(app.options.graphql?.resolvers ?? []),
    ]

    return resolvers
  }

  app.options.virtual ??= {}
  app.options.virtual['#nitro-internal-virtual/server-resolvers'] = () => {
    const imports = getResolvers()
    //     const code = /* js */`
    const importsContent = [
      ...imports.map(({ specifier, imports, options }) => {
        // https://github.com/unjs/knitwork/pull/113 extendiso support (silgi.options.typescript.removeFileExtension)
        return genImport(specifier, imports, options)
      }),
    ]

    const data = imports.map(({ imports }) => {
      for (const i of imports) {
        if (i.type === 'resolver') {
          // return `${i.as}`
          return `{ resolver: ${i.as} }`
        }
      }
      return undefined
    }).filter(Boolean).join(',\n')

    const content = [
      'export const resolvers = [',
      data,
      ']',
      '',
    ]

    content.unshift(...importsContent)

    const code = content.join('\n')

    return code
  }
}
