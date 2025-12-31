/**
 * Init command
 * Initialize project structure for standalone CLI
 * Supports downloading templates from GitHub
 */

import type { CLIContext } from '../index'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import consola from 'consola'
import { downloadTemplate } from 'giget'
import { basename, join, relative, resolve } from 'pathe'
import { LOG_TAG } from '../../core/constants'

const logger = consola.withTag(LOG_TAG)

/**
 * Available templates from the examples directory
 */
export const AVAILABLE_TEMPLATES = [
  {
    name: 'drizzle-orm',
    description: 'Nitro + GraphQL + Drizzle ORM with PostgreSQL',
  },
  {
    name: 'vite',
    description: 'Vite + Nitro GraphQL integration',
  },
  {
    name: 'vite-react',
    description: 'Vite + React + Nitro GraphQL',
  },
  {
    name: 'vite-vue',
    description: 'Vite + Vue + Nitro GraphQL',
  },
  {
    name: 'better-auth',
    description: 'Nitro + GraphQL + Better Auth integration',
  },
] as const

export type TemplateName = typeof AVAILABLE_TEMPLATES[number]['name']

/**
 * Default GitHub template source
 */
const DEFAULT_TEMPLATE_REGISTRY = 'github:productdevbook/nitro-graphql/examples'

/**
 * List available templates
 */
export function listTemplates(): void {
  logger.info('Available templates:\n')

  for (const template of AVAILABLE_TEMPLATES) {
    console.log(`  ${template.name.padEnd(15)} - ${template.description}`)
  }

  console.log('\nUsage:')
  console.log('  nitro-graphql init <project-name> --template <template-name>')
  console.log('  nitro-graphql init my-app -t drizzle-orm')
  console.log('\nCustom templates:')
  console.log('  nitro-graphql init my-app -t gh:user/repo')
  console.log('  nitro-graphql init my-app -t github:user/repo/subdir')
}

/**
 * Initialize project from template
 */
export async function initFromTemplate(
  projectName: string,
  templateName: string,
  options: { force?: boolean, cwd?: string } = {},
): Promise<void> {
  const { force, cwd = process.cwd() } = options
  const targetDir = resolve(cwd, projectName)

  // Check if target directory exists
  if (existsSync(targetDir) && !force) {
    logger.error(`Directory "${projectName}" already exists. Use --force to overwrite.`)
    process.exit(1)
  }

  // Resolve template source
  let templateSource: string

  // Check if it's a custom template (gh:, github:, gitlab:, etc.)
  if (templateName.includes(':') || templateName.includes('/')) {
    templateSource = templateName
  }
  else {
    // Check if it's a known template
    const knownTemplate = AVAILABLE_TEMPLATES.find(t => t.name === templateName)
    if (!knownTemplate) {
      logger.error(`Unknown template: "${templateName}"`)
      logger.info('Use --list to see available templates')
      process.exit(1)
    }
    templateSource = `${DEFAULT_TEMPLATE_REGISTRY}/${templateName}`
  }

  logger.info(`Downloading template: ${templateName}`)
  logger.debug(`Source: ${templateSource}`)

  try {
    // Download template
    const result = await downloadTemplate(templateSource, {
      dir: targetDir,
      force,
    })

    logger.success(`Template downloaded to: ${result.dir}`)

    // Update package.json name
    const packageJsonPath = join(targetDir, 'package.json')
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
        const slug = basename(projectName)
          .replace(/[^a-z0-9-]/gi, '-')
          .replace(/^-+|-+$/g, '')
          .toLowerCase()

        packageJson.name = slug || 'my-graphql-app'
        writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf-8')
        logger.debug(`Updated package.json name to: ${packageJson.name}`)
      }
      catch {
        logger.warn('Could not update package.json name')
      }
    }

    // Print next steps
    console.log('')
    logger.info('Next steps:')
    console.log(`  cd ${projectName}`)
    console.log('  pnpm install')
    console.log('  pnpm dev')
    console.log('')
  }
  catch (error) {
    logger.error('Failed to download template:', error)
    process.exit(1)
  }
}

/**
 * Initialize project structure (basic scaffolding)
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
