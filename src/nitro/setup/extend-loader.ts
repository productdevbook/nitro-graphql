/**
 * Nitro Extend Loader
 *
 * Thin wrapper around core extend module.
 * Handles Nitro-specific state mutations.
 */

import type { Nitro } from 'nitro/types'
import type { ExtendScanResult } from '../../core/extend'
import consola from 'consola'
import { LOG_TAG } from '../../core/constants'
import {
  resolveExtendDirs as coreResolveExtendDirs,

  scanAllExtendSources,
} from '../../core/extend'
import { generateDirectiveSchemas } from '../../core/utils/directive-parser'

const logger = consola.withTag(LOG_TAG)

/**
 * Resolve extend directories for file watching
 */
export async function resolveExtendDirs(nitro: Nitro): Promise<string[]> {
  const extend = nitro.options.graphql?.extend
  return coreResolveExtendDirs(extend as any, nitro.options.rootDir)
}

interface ResolveExtendOptions {
  silent?: boolean
}

/**
 * Resolve extend configuration and add files to Nitro scan results
 */
export async function resolveExtendConfig(nitro: Nitro, options: ResolveExtendOptions = {}): Promise<void> {
  const extend = nitro.options.graphql?.extend
  if (!extend || !Array.isArray(extend) || extend.length === 0) {
    return
  }

  // Use core to scan all sources
  const result = await scanAllExtendSources(extend as any, nitro.options.rootDir)

  // Apply results to Nitro state
  const stats = applyExtendResult(nitro, result)

  // Regenerate directive schemas if needed
  if (stats.directives > 0) {
    const directiveSchemas = await generateDirectiveSchemas(nitro.scanDirectives, nitro.graphql.buildDir)
    nitro.graphql.directiveSchemas = directiveSchemas
  }

  // Log summary
  if (!options.silent && (stats.schemas > 0 || stats.resolvers > 0 || stats.directives > 0 || stats.documents > 0)) {
    const parts = []
    if (stats.schemas > 0)
      parts.push(`${stats.schemas} schema(s)`)
    if (stats.resolvers > 0)
      parts.push(`${stats.resolvers} resolver(s)`)
    if (stats.directives > 0)
      parts.push(`${stats.directives} directive(s)`)
    if (stats.documents > 0)
      parts.push(`${stats.documents} document(s)`)
    if (stats.configs > 0)
      parts.push(`${stats.configs} config(s)`)
    if (stats.programmaticSchemas > 0)
      parts.push(`${stats.programmaticSchemas} programmatic schema(s)`)
    logger.info(`Extended with ${parts.join(', ')}`)
  }
}

/**
 * Apply extend scan result to Nitro state
 */
function applyExtendResult(nitro: Nitro, result: ExtendScanResult) {
  let schemasAdded = 0
  let resolversAdded = 0
  let directivesAdded = 0
  let documentsAdded = 0
  let configsAdded = 0
  let programmaticSchemasAdded = 0

  // Add schemas
  for (const schemaPath of result.schemas) {
    if (!nitro.scanSchemas.includes(schemaPath)) {
      nitro.scanSchemas.push(schemaPath)
      schemasAdded++
    }
  }

  // Add resolvers
  for (const resolver of result.resolvers) {
    const alreadyExists = nitro.scanResolvers.some(r => r.specifier === resolver.specifier)
    if (!alreadyExists) {
      nitro.scanResolvers.push(resolver)
      resolversAdded++
    }
  }

  // Add directives
  for (const directive of result.directives) {
    const alreadyExists = nitro.scanDirectives.some(d => d.specifier === directive.specifier)
    if (!alreadyExists) {
      nitro.scanDirectives.push(directive)
      directivesAdded++
    }
  }

  // Add documents
  for (const docPath of result.documents) {
    if (!nitro.scanDocuments.includes(docPath)) {
      nitro.scanDocuments.push(docPath)
      documentsAdded++
    }
  }

  // Add config path
  if (result.configPath && !nitro.graphql.extendConfigs.includes(result.configPath)) {
    nitro.graphql.extendConfigs.push(result.configPath)
    configsAdded++
  }

  // Add schema path
  if (result.schemaPath && !nitro.graphql.extendSchemas.includes(result.schemaPath)) {
    nitro.graphql.extendSchemas.push(result.schemaPath)
    programmaticSchemasAdded++
  }

  return {
    schemas: schemasAdded,
    resolvers: resolversAdded,
    directives: directivesAdded,
    documents: documentsAdded,
    configs: configsAdded,
    programmaticSchemas: programmaticSchemasAdded,
  }
}
