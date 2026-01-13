/**
 * CLI Build Command
 *
 * Builds GraphQL types and validates schemas for production.
 */

import { defineCommand } from 'citty'
import consola from 'consola'
import { createCLIContext } from '../index'
import { generateAll } from './generate'
import { validate } from './validate'

const logger = consola.withTag('nitro-graphql')

export const buildCommand = defineCommand({
  meta: {
    name: 'build',
    description: 'Build GraphQL types for production',
  },
  args: {
    cwd: {
      type: 'string',
      description: 'Working directory',
    },
    skipValidation: {
      type: 'boolean',
      description: 'Skip schema validation',
      default: false,
    },
  },
  async run({ args }) {
    const ctx = await createCLIContext({ cwd: args.cwd })

    logger.info('Building GraphQL for production...')

    // Step 1: Validate schemas (unless skipped)
    if (!args.skipValidation) {
      logger.info('Validating schemas...')
      const isValid = await validate(ctx)
      if (!isValid) {
        logger.error('Schema validation failed!')
        process.exit(1)
      }
      logger.success('Schema validation passed')
    }

    // Step 2: Generate all types
    logger.info('Generating types...')
    await generateAll(ctx, { silent: false, runtime: true })

    logger.success('Build complete!')
    logger.info(`Output: ${ctx.config.buildDir}`)
  },
})
