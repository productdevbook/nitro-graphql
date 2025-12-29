/**
 * Init command
 * Initialize project structure for standalone CLI
 */

import type { CLIContext } from '../index'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import consola from 'consola'
import { join, relative } from 'pathe'
import { LOG_TAG } from '../../core/constants'

const logger = consola.withTag(LOG_TAG)

/**
 * Initialize project structure
 */
export async function init(
  ctx: CLIContext,
  options: { force?: boolean } = {},
): Promise<void> {
  const { force } = options

  // Create directories (only server and client dirs, build dirs created on generate)
  const dirs = [
    ctx.config.serverDir,
    ctx.config.clientDir,
  ]

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
      logger.info(`Created directory: ${dir}`)
    }
  }

  // Create config file
  const configPath = join(ctx.config.rootDir, 'nitro-graphql.config.ts')
  if (force || !existsSync(configPath)) {
    // Use relative paths in config file
    const relativeServerDir = relative(ctx.config.rootDir, ctx.config.serverDir) || 'server/graphql'
    const relativeClientDir = relative(ctx.config.rootDir, ctx.config.clientDir) || 'graphql'

    const configContent = `import { defineConfig } from 'nitro-graphql/cli'

export default defineConfig({
  framework: '${ctx.config.framework}',
  serverDir: './${relativeServerDir}',
  clientDir: './${relativeClientDir}',
})
`
    writeFileSync(configPath, configContent, 'utf-8')
    logger.success(`Created config file: ${configPath}`)
  }
  else {
    logger.info(`Config file already exists: ${configPath}`)
  }

  // Create tsconfig.json
  const tsconfigPath = join(ctx.config.rootDir, 'tsconfig.json')
  if (force || !existsSync(tsconfigPath)) {
    const relativeBuildDir = relative(ctx.config.rootDir, ctx.config.buildDir) || '.graphql'
    const relativeServerDir = relative(ctx.config.rootDir, ctx.config.serverDir) || 'server/graphql'

    const tsconfigContent = `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "#graphql/server": ["./${relativeBuildDir}/types/nitro-graphql-server.d.ts"],
      "#graphql/client": ["./${relativeBuildDir}/types/nitro-graphql-client.d.ts"],
      "#graphql/schema": ["./${relativeServerDir}/schema.ts"]
    }
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "${relativeBuildDir}"]
}
`
    writeFileSync(tsconfigPath, tsconfigContent, 'utf-8')
    logger.success(`Created tsconfig.json: ${tsconfigPath}`)
  }
  else {
    logger.info(`tsconfig.json already exists: ${tsconfigPath}`)
  }

  // Create example schema
  const schemaPath = join(ctx.config.serverDir, 'schema.graphql')
  if (force || !existsSync(schemaPath)) {
    const schemaContent = `# GraphQL Schema
# Add your type definitions here

type Query {
  hello: String!
}

type Mutation {
  # Add your mutations here
  _empty: String
}
`
    writeFileSync(schemaPath, schemaContent, 'utf-8')
    logger.success(`Created example schema: ${schemaPath}`)
  }
  else {
    logger.info(`Schema file already exists: ${schemaPath}`)
  }

  // Create example resolver
  const resolverPath = join(ctx.config.serverDir, 'hello.resolver.ts')
  if (force || !existsSync(resolverPath)) {
    const resolverContent = `import { defineQuery } from 'nitro-graphql/define'

export const helloQueries = defineQuery({
  hello: () => 'Hello, world!',
})
`
    writeFileSync(resolverPath, resolverContent, 'utf-8')
    logger.success(`Created example resolver: ${resolverPath}`)
  }
  else {
    logger.info(`Resolver file already exists: ${resolverPath}`)
  }

  // Create example client query
  const queryPath = join(ctx.config.clientDir, 'hello.graphql')
  if (force || !existsSync(queryPath)) {
    const queryContent = `query Hello {
  hello
}
`
    writeFileSync(queryPath, queryContent, 'utf-8')
    logger.success(`Created example query: ${queryPath}`)
  }
  else {
    logger.info(`Query file already exists: ${queryPath}`)
  }

  logger.info('')
  logger.info('Next steps:')
  logger.info('  1. Run "nitro-graphql generate" to generate types')
  logger.info('  2. Add more schemas to your server directory')
  logger.info('  3. Add more queries/mutations to your client directory')
}
