#!/usr/bin/env node
/**
 * nitro-graphql CLI
 * Standalone command-line interface for GraphQL type generation
 */

import type { NitroGraphQLOptions } from '../nitro/types'
import { existsSync } from 'node:fs'
import { defineCommand, runMain } from 'citty'
import consola from 'consola'
import { resolve } from 'pathe'
import { LOG_TAG } from '../core/constants'
import { DEFAULT_CLI_CONFIG } from './config'

const logger = consola.withTag(LOG_TAG)

/**
 * CLI context with resolved configuration
 * Uses NitroGraphQLOptions directly as CLI and module options are now unified
 */
export interface CLIContext {
  config: Required<Pick<NitroGraphQLOptions, 'rootDir' | 'buildDir' | 'serverDir' | 'clientDir' | 'typesDir' | 'framework'>>
    & { ignore: string[] }
    & NitroGraphQLOptions
  cwd: string
}

/**
 * Load CLI configuration from file or defaults
 */
export async function loadConfig(cwd: string = process.cwd()): Promise<NitroGraphQLOptions> {
  const configFiles = [
    'nitro-graphql.config.ts',
    'nitro-graphql.config.js',
    'nitro-graphql.config.mjs',
    'graphql.config.ts',
  ]

  for (const file of configFiles) {
    const configPath = resolve(cwd, file)
    if (existsSync(configPath)) {
      try {
        // Dynamic import for config file
        const module = await import(configPath)
        const config = module.default || module
        logger.info(`Loaded config from ${file}`)
        return { ...DEFAULT_CLI_CONFIG, ...config }
      }
      catch (error) {
        logger.warn(`Failed to load config from ${file}:`, error)
      }
    }
  }

  logger.debug('Using default configuration')
  return { ...DEFAULT_CLI_CONFIG }
}

/**
 * Create CLI context from configuration
 */
export async function createCLIContext(options: { cwd?: string } = {}): Promise<CLIContext> {
  const cwd = options.cwd || process.cwd()
  const config = await loadConfig(cwd)

  // Resolve all paths relative to cwd
  const rootDir = config.rootDir ? resolve(cwd, config.rootDir) : cwd
  const buildDir = config.buildDir ? resolve(rootDir, config.buildDir) : resolve(rootDir, '.nitro-graphql')
  const serverDir = config.serverDir ? resolve(rootDir, config.serverDir) : resolve(rootDir, 'server/graphql')
  const clientDir = config.clientDir ? resolve(rootDir, config.clientDir) : resolve(rootDir, 'graphql')
  const typesDir = config.typesDir ? resolve(rootDir, config.typesDir) : resolve(buildDir, 'types')

  return {
    cwd,
    config: {
      ...config,
      rootDir,
      buildDir,
      serverDir,
      clientDir,
      typesDir,
      framework: config.framework || 'graphql-yoga',
      ignore: config.ignore || ['**/node_modules/**', '**/dist/**'],
    },
  }
}

// Subcommands
const generateCommand = defineCommand({
  meta: {
    name: 'generate',
    description: 'Generate all GraphQL types',
  },
  args: {
    cwd: {
      type: 'string',
      description: 'Set working directory',
    },
    silent: {
      type: 'boolean',
      alias: 's',
      description: 'Suppress output',
    },
    watch: {
      type: 'boolean',
      alias: 'w',
      description: 'Watch mode',
    },
    runtime: {
      type: 'boolean',
      alias: 'r',
      description: 'Generate runtime files (resolvers.ts, schema.ts)',
    },
  },
  async run({ args }) {
    const ctx = await createCLIContext({ cwd: args.cwd })
    const silent = Boolean(args.silent)
    const watch = Boolean(args.watch)
    const runtime = Boolean(args.runtime) || Boolean(ctx.config.runtime)

    if (!silent) {
      logger.info('Generating GraphQL types...')
    }

    const { generateAll } = await import('./commands/generate')
    await generateAll(ctx, { silent, watch, runtime })

    if (!silent) {
      logger.success('Type generation complete!')
    }
  },
})

const generateServerCommand = defineCommand({
  meta: {
    name: 'generate:server',
    description: 'Generate server types only',
  },
  args: {
    cwd: {
      type: 'string',
      description: 'Set working directory',
    },
    silent: {
      type: 'boolean',
      alias: 's',
      description: 'Suppress output',
    },
  },
  async run({ args }) {
    const ctx = await createCLIContext({ cwd: args.cwd })
    const silent = Boolean(args.silent)

    if (!silent) {
      logger.info('Generating server types...')
    }

    const { generateServer } = await import('./commands/generate')
    await generateServer(ctx, { silent })

    if (!silent) {
      logger.success('Server type generation complete!')
    }
  },
})

const generateClientCommand = defineCommand({
  meta: {
    name: 'generate:client',
    description: 'Generate client types only',
  },
  args: {
    cwd: {
      type: 'string',
      description: 'Set working directory',
    },
    silent: {
      type: 'boolean',
      alias: 's',
      description: 'Suppress output',
    },
  },
  async run({ args }) {
    const ctx = await createCLIContext({ cwd: args.cwd })
    const silent = Boolean(args.silent)

    if (!silent) {
      logger.info('Generating client types...')
    }

    const { generateClient } = await import('./commands/generate')
    await generateClient(ctx, { silent })

    if (!silent) {
      logger.success('Client type generation complete!')
    }
  },
})

const validateCommand = defineCommand({
  meta: {
    name: 'validate',
    description: 'Validate GraphQL schemas',
  },
  args: {
    cwd: {
      type: 'string',
      description: 'Set working directory',
    },
  },
  async run({ args }) {
    const ctx = await createCLIContext({ cwd: args.cwd })

    logger.info('Validating GraphQL schemas...')

    const { validate } = await import('./commands/validate')
    const isValid = await validate(ctx)

    if (isValid) {
      logger.success('Schema validation passed!')
    }
    else {
      logger.error('Schema validation failed!')
      process.exit(1)
    }
  },
})

const initCommand = defineCommand({
  meta: {
    name: 'init',
    description: 'Initialize project structure or download a template',
  },
  args: {
    projectName: {
      type: 'positional',
      description: 'Project name (directory to create)',
      required: false,
    },
    cwd: {
      type: 'string',
      description: 'Set working directory',
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Force overwrite existing files',
    },
    template: {
      type: 'string',
      alias: 't',
      description: 'Template to use (e.g., drizzle-orm, vite-react)',
    },
    list: {
      type: 'boolean',
      alias: 'l',
      description: 'List available templates',
    },
  },
  async run({ args }) {
    const { listTemplates, initFromTemplate, init } = await import('./commands/init')

    // List templates
    if (args.list) {
      listTemplates()
      return
    }

    // Template mode: download template
    if (args.template) {
      const projectName = args.projectName || args.template
      logger.info(`Creating project "${projectName}" from template "${args.template}"...`)
      await initFromTemplate(projectName, args.template, {
        force: Boolean(args.force),
        cwd: args.cwd || process.cwd(),
      })
      logger.success('Project created successfully!')
      return
    }

    // Basic scaffolding mode
    const ctx = await createCLIContext({ cwd: args.cwd })
    logger.info('Initializing nitro-graphql project...')
    await init(ctx, {
      force: Boolean(args.force),
    })
    logger.success('Project initialized!')
  },
})

// Main command
const main = defineCommand({
  meta: {
    name: 'nitro-graphql',
    version: '2.0.0',
    description: 'GraphQL type generation CLI for Nitro',
  },
  subCommands: {
    'generate': generateCommand,
    'gen': generateCommand,
    'g': generateCommand,
    'generate:server': generateServerCommand,
    'gen:server': generateServerCommand,
    'generate:client': generateClientCommand,
    'gen:client': generateClientCommand,
    'validate': validateCommand,
    'v': validateCommand,
    'init': initCommand,
  },
})

// Re-export config utilities
export { defineConfig } from './config'
export type { CLIConfig } from './config'

// Run CLI with completions
async function run() {
  const { initCompletions } = await import('./completions')
  await initCompletions(main)
  return runMain(main)
}

run()
