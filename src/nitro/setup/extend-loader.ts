/**
 * Nitro Extend Loader
 *
 * Thin wrapper around core extend module.
 * Returns new immutable state via mergeScanState instead of mutating nitro.
 */

import type { Nitro } from 'nitro/types'
import type { GraphQLScanState } from '../types/augmentation'
import consola from 'consola'
import { LOG_TAG } from '../../core/constants'
import {
  resolveExtendDirs as coreResolveExtendDirs,
  scanAllExtendSources,
} from '../../core/extend'
import { generateDirectiveSchemas } from '../../core/utils/directive-parser'
import { mergeScanState } from '../state'

const logger = consola.withTag(LOG_TAG)

/**
 * Resolve extend directories for file watching
 */
export async function resolveExtendDirs(nitro: Nitro): Promise<string[]> {
  const extend = nitro.options.graphql?.extend
  return coreResolveExtendDirs(extend, nitro.options.rootDir)
}

/**
 * Resolve extend configuration and merge into scan state.
 * Returns a new frozen state — does NOT mutate nitro.
 */
export async function resolveExtendConfig(
  nitro: Nitro,
  state: GraphQLScanState,
  options: { silent?: boolean } = {},
): Promise<GraphQLScanState> {
  const extend = nitro.options.graphql?.extend
  if (!extend || !Array.isArray(extend) || extend.length === 0) {
    return state
  }

  const result = await scanAllExtendSources(extend, nitro.options.rootDir)

  // Merge extend results into state (returns new frozen object)
  let newState = mergeScanState(state, result)

  // Regenerate directive schemas if extend added directives
  if (result.directives.length > 0) {
    const directiveSchemas = await generateDirectiveSchemas(
      [...newState.directives],
      nitro.graphql.buildDir,
    )
    newState = Object.freeze({ ...newState, directiveSchemas })
  }

  // Log summary
  const added = {
    schemas: newState.schemas.length - state.schemas.length,
    resolvers: newState.resolvers.length - state.resolvers.length,
    directives: newState.directives.length - state.directives.length,
    documents: newState.documents.length - state.documents.length,
    configs: newState.extendConfigs.length - state.extendConfigs.length,
    programmaticSchemas: newState.extendSchemas.length - state.extendSchemas.length,
  }

  if (!options.silent && Object.values(added).some(v => v > 0)) {
    const parts = []
    if (added.schemas > 0)
      parts.push(`${added.schemas} schema(s)`)
    if (added.resolvers > 0)
      parts.push(`${added.resolvers} resolver(s)`)
    if (added.directives > 0)
      parts.push(`${added.directives} directive(s)`)
    if (added.documents > 0)
      parts.push(`${added.documents} document(s)`)
    if (added.configs > 0)
      parts.push(`${added.configs} config(s)`)
    if (added.programmaticSchemas > 0)
      parts.push(`${added.programmaticSchemas} programmatic schema(s)`)
    logger.info(`Extended with ${parts.join(', ')}`)
  }

  return newState
}
