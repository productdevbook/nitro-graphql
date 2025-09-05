import type { Nitro } from 'nitropack'

import { readFile } from 'node:fs/promises'
import { parse } from 'graphql'
import { genImport } from 'knitwork'
import { resolve } from 'pathe'
import { getImportId, scanGraphql } from './utils'
import { clientTypeGeneration, serverTypeGeneration } from './utils/type-generation'

export async function rollupConfig(app: Nitro) {
  virtualSchemas(app)
  virtualResolvers(app)
  virtualDirectives(app)
  getGraphQLConfig(app)
  virtualModuleConfig(app)
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
            if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
              return null
            }
            const message = error instanceof Error ? error.message : String(error)
            this.error(`Failed to read GraphQL file ${id}: ${message}`)
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
          this.addWatchFile(app.graphql.serverDir)

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
    await clientTypeGeneration(app)
  })
}

export function virtualSchemas(app: Nitro) {
  const getSchemas = () => {
    const schemas: string[] = [
      ...app.scanSchemas,
      ...(app.options.graphql?.typedefs ?? []),
    ]

    return schemas
  }

  app.options.virtual ??= {}
  app.options.virtual['#nitro-internal-virtual/server-schemas'] = () => {
    const imports = getSchemas()

    const code = /* js */`
${imports
  .map(handler => `import ${getImportId(handler)} from '${handler}';`)
  .join('\n')}

export const schemas = [
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

    const data = imports
      .map(({ imports }) =>
        imports.map(i => `{ resolver: ${i.as} }`).join(',\n'),
      )
      .filter(Boolean)
      .join(',\n')

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

export function virtualDirectives(app: Nitro) {
  const getDirectives = () => {
    const directives = [
      ...(app.scanDirectives || []),
    ]

    return directives
  }

  app.options.virtual ??= {}
  app.options.virtual['#nitro-internal-virtual/server-directives'] = () => {
    const imports = getDirectives()
    const importsContent = [
      ...imports.map(({ specifier, imports, options }) => {
        return genImport(specifier, imports, options)
      }),
    ]

    const data = imports
      .map(({ imports }) =>
        imports.map(i => `{ directive: ${i.as} }`).join(',\n'),
      )
      .filter(Boolean)
      .join(',\n')

    const content = [
      'export const directives = [',
      data,
      ']',
      '',
    ]

    content.unshift(...importsContent)

    const code = content.join('\n')

    return code
  }
}

export function getGraphQLConfig(app: Nitro) {
  const configPath = resolve(app.graphql.serverDir, 'config.ts')

  app.options.virtual ??= {}
  app.options.virtual['#nitro-internal-virtual/graphql-config'] = () => {
    return `import config from '${configPath}'
const importedConfig = config
export { importedConfig }
`
  }
}

export function virtualModuleConfig(app: Nitro) {
  app.options.virtual ??= {}
  app.options.virtual['#nitro-internal-virtual/module-config'] = () => {
    const moduleConfig = app.options.graphql || {}

    return `export const moduleConfig = ${JSON.stringify(moduleConfig, null, 2)};`
  }
}
