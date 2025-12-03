/**
 * Scaffold file generation for GraphQL setup
 * Generates initial files like graphql.config.ts, schema.ts, config.ts, context.d.ts
 */

import type { Nitro } from 'nitro/types'
import { existsSync, mkdirSync } from 'node:fs'
import consola from 'consola'
import { join, resolve } from 'pathe'
import {
  FILE_CONFIG_TS,
  FILE_CONTEXT_DTS,
  FILE_CONTEXT_TS,
  FILE_GRAPHQL_CONFIG,
  FILE_SCHEMA_TS,
  LOG_TAG,
} from '../constants'
import { relativeWithDot } from '../utils'
import { writeFileIfNotExists } from '../utils/file-generator'
import {
  getDefaultPaths,
  getScaffoldConfig,
  resolveFilePath,
  shouldGenerateScaffold,
} from '../utils/path-resolver'

const logger = consola.withTag(LOG_TAG)

/**
 * Generate all scaffold files based on configuration
 * Can be disabled via: scaffold: false or scaffold.enabled: false
 */
export function generateScaffoldFiles(nitro: Nitro): void {
  if (!shouldGenerateScaffold(nitro)) {
    logger.info('Scaffold file generation is disabled (library mode)')
    return
  }

  const placeholders = getDefaultPaths(nitro)
  const scaffoldConfig = getScaffoldConfig(nitro)

  // 1. graphql.config.ts - GraphQL Config for IDE tooling
  generateGraphQLConfig(nitro, scaffoldConfig, placeholders)

  // 2-4. Server files (schema.ts, config.ts, context.d.ts)
  generateServerScaffoldFiles(nitro, scaffoldConfig, placeholders)

  // Check for old context.ts file and warn users to migrate
  checkOldContextFile(nitro)
}

/**
 * Generate graphql.config.ts for IDE tooling support
 */
function generateGraphQLConfig(
  nitro: Nitro,
  scaffoldConfig: ReturnType<typeof getScaffoldConfig>,
  placeholders: ReturnType<typeof getDefaultPaths>,
): void {
  const graphqlConfigPath = resolveFilePath(
    scaffoldConfig.graphqlConfig,
    scaffoldConfig.enabled,
    true,
    FILE_GRAPHQL_CONFIG,
    placeholders,
  )

  if (!graphqlConfigPath) {
    return
  }

  const schemaPath = relativeWithDot(
    nitro.options.rootDir,
    resolve(nitro.graphql.buildDir, 'schema.graphql'),
  )
  const documentsPath = relativeWithDot(
    nitro.options.rootDir,
    resolve(nitro.graphql.clientDir, '**/*.{graphql,js,ts,jsx,tsx}'),
  )

  const content = `import type { IGraphQLConfig } from 'graphql-config'

export default <IGraphQLConfig> {
    projects: {
      default: {
        schema: [
          '${schemaPath}',
        ],
        documents: [
          '${documentsPath}',
        ],
      },
    },
}`

  writeFileIfNotExists(graphqlConfigPath, content, FILE_GRAPHQL_CONFIG)
}

/**
 * Generate server-side scaffold files (schema.ts, config.ts, context.d.ts)
 */
function generateServerScaffoldFiles(
  nitro: Nitro,
  scaffoldConfig: ReturnType<typeof getScaffoldConfig>,
  placeholders: ReturnType<typeof getDefaultPaths>,
): void {
  // Resolve all server file paths
  const serverSchemaPath = resolveFilePath(
    scaffoldConfig.serverSchema,
    scaffoldConfig.enabled,
    true,
    '{serverGraphql}/schema.ts',
    placeholders,
  )
  const serverConfigPath = resolveFilePath(
    scaffoldConfig.serverConfig,
    scaffoldConfig.enabled,
    true,
    '{serverGraphql}/config.ts',
    placeholders,
  )
  const serverContextPath = resolveFilePath(
    scaffoldConfig.serverContext,
    scaffoldConfig.enabled,
    true,
    '{serverGraphql}/context.d.ts',
    placeholders,
  )

  // Create server directory if any server scaffold files will be generated
  if (serverSchemaPath || serverConfigPath || serverContextPath) {
    if (!existsSync(nitro.graphql.serverDir)) {
      mkdirSync(nitro.graphql.serverDir, { recursive: true })
    }
  }

  // Generate schema.ts
  if (serverSchemaPath) {
    const schemaContent = `export default defineSchema({

})
`
    writeFileIfNotExists(serverSchemaPath, schemaContent, `server ${FILE_SCHEMA_TS}`)
  }

  // Generate config.ts
  if (serverConfigPath) {
    const configContent = `// Example GraphQL config file please change it to your needs
// import * as tables from '../drizzle/schema/index'
// import { useDatabase } from '../utils/useDb'
import { defineGraphQLConfig } from 'nitro-graphql/define'

export default defineGraphQLConfig({
// graphql-yoga example config
// context: () => {
//   return {
//     context: {
//       useDatabase,
//       tables,
//     },
//   }
// },
})
`
    writeFileIfNotExists(serverConfigPath, configContent, `server ${FILE_CONFIG_TS}`)
  }

  // Generate context.d.ts
  if (serverContextPath) {
    const contextContent = `// Example context definition - please change it to your needs
// import type { Database } from '../utils/useDb'

declare module 'nitro/h3' {
  interface H3EventContext {
    // Add your custom context properties here
    // useDatabase: () => Database
    // tables: typeof import('../drizzle/schema')
    // auth?: {
    //   user?: {
    //     id: string
    //     role: 'admin' | 'user'
    //   }
    // }
  }
}

export {}
`
    writeFileIfNotExists(serverContextPath, contextContent, `server ${FILE_CONTEXT_DTS}`)
  }
}

/**
 * Check for old context.ts file and warn users to migrate to context.d.ts
 */
function checkOldContextFile(nitro: Nitro): void {
  const oldContextPath = join(nitro.graphql.serverDir, FILE_CONTEXT_TS)
  if (existsSync(oldContextPath)) {
    logger.warn(`Found ${FILE_CONTEXT_TS} file. Please rename it to ${FILE_CONTEXT_DTS} for type-only definitions.`)
    logger.info(`The context file should now be ${FILE_CONTEXT_DTS} instead of ${FILE_CONTEXT_TS}`)
  }
}
