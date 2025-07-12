import type { Nitro } from 'nitropack'
import { readFile } from 'node:fs/promises'
import { parse } from 'graphql'
import { hash } from 'ohash'

import { scanGraphql } from './utils'

export async function rollupConfig(app: Nitro) {
  rollupPlugin(app)

  app.hooks.hook('rollup:before', (nitro, rollupConfig) => {
    rollupConfig.plugins = rollupConfig.plugins || []
    const {
      include = /\.(graphql|gql)$/i,
      exclude,
      validate = false,
      typescript = false,
    } = app.options.graphqlYoga?.loader || {}

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

          for (const file of graphqlFiles) {
            this.addWatchFile(file)
          }

          // 2. Directory watching (partial çalışır)
          this.addWatchFile('server/graphql/')
        },
      })
    }
  })

  if (!app.options.dev) {
    app.options.rollupConfig ??= {} as any
    if (app.options.rollupConfig) {
      app.options.rollupConfig.plugins ??= []

      const originalExternal = app.options.rollupConfig.external
      app.options.rollupConfig.external = (id, parentId, isResolved) => {
        if (id.startsWith('./dev')) {
          return true
        }
        if (id.startsWith('./prerender') && !app.options.prerender) {
          return true
        }

        // Orijinal external logic'i koru
        if (typeof originalExternal === 'function') {
          return originalExternal(id, parentId, isResolved)
        }
        if (Array.isArray(originalExternal)) {
          return originalExternal.includes(id)
        }
        return false
      }
    }
  }
}

declare module 'nitropack/types' {
  interface Nitro {
    scanDefs: any
  }
}
function getImportId(p: string, lazy?: boolean) {
  return (lazy ? '_lazy_' : '_') + hash(p).replace(/-/g, '').slice(0, 6)
}
export function rollupPlugin(app: Nitro) {
  const getHandlers = () => {
    const defs: string[] = [
      ...app.scanDefs,
      ...(app.options.graphqlYoga?.typedefs ?? []),
    ]

    return defs
  }

  app.options.virtual ??= {}
  app.options.virtual['#nitro-internal-virtual/server-defs'] = () => {
    const imports = getHandlers()

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
