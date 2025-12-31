/**
 * Validate command
 * Schema validation for standalone CLI
 */

import type { ScanContext } from '../../core/types'
import type { CLIContext } from '../index'
import { existsSync, readFileSync } from 'node:fs'
import consola from 'consola'
import { validateNoDuplicateTypes } from '../../core/codegen'
import { LOG_TAG } from '../../core/constants'
import { scanSchemasCore } from '../../core/scanning'

const logger = consola.withTag(LOG_TAG)

/**
 * Validate GraphQL schemas
 */
export async function validate(ctx: CLIContext): Promise<boolean> {
  const scanCtx: ScanContext = {
    rootDir: ctx.config.rootDir,
    serverDir: ctx.config.serverDir,
    clientDir: ctx.config.clientDir,
    ignorePatterns: ctx.config.ignore,
    isDev: false,
    logger: {
      info: (msg, ...args) => logger.info(msg, ...args),
      warn: (msg, ...args) => logger.warn(msg, ...args),
      error: (msg, ...args) => logger.error(msg, ...args),
      success: (msg, ...args) => logger.success(msg, ...args),
      debug: (msg, ...args) => logger.debug(msg, ...args),
    },
    layerServerDirs: [],
    layerAppDirs: [],
  }

  // Scan for schema files
  const schemaResult = await scanSchemasCore(scanCtx)

  if (schemaResult.errors.length > 0) {
    for (const error of schemaResult.errors) {
      logger.error(error)
    }
    return false
  }

  if (schemaResult.items.length === 0) {
    logger.warn('No GraphQL schemas found to validate')
    return true
  }

  // Load and validate schema contents
  const schemaContents: string[] = []

  for (const schemaPath of schemaResult.items) {
    if (!existsSync(schemaPath)) {
      logger.error(`Schema file not found: ${schemaPath}`)
      return false
    }

    try {
      const content = readFileSync(schemaPath, 'utf-8')
      schemaContents.push(content)
    }
    catch (error) {
      logger.error(`Failed to read schema file ${schemaPath}:`, error)
      return false
    }
  }

  // Validate schema content for duplicate types
  const isValid = validateNoDuplicateTypes(schemaResult.items, schemaContents)

  if (!isValid) {
    logger.error('Schema validation failed')
    return false
  }

  // Try to build the schema to catch syntax errors
  try {
    const { buildSchema, print } = await import('graphql')
    const { mergeTypeDefs } = await import('@graphql-tools/merge')

    const mergedTypeDefs = mergeTypeDefs(schemaContents)
    // Convert DocumentNode to string for buildSchema
    const schemaString = typeof mergedTypeDefs === 'string'
      ? mergedTypeDefs
      : print(mergedTypeDefs)
    buildSchema(schemaString)

    logger.info(`Validated ${schemaResult.items.length} schema file(s)`)
    return true
  }
  catch (error) {
    logger.error('Schema syntax error:', error)
    return false
  }
}
