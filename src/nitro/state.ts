/**
 * GraphQL Scan State Management
 *
 * Immutable state snapshots for the scan → virtual module → codegen pipeline.
 * All mutations go through createScanState() or mergeScanState() which produce
 * new frozen objects. Consumers never mutate state directly.
 */

import type { GenImport } from './types'
import type { GraphQLScanState } from './types/augmentation'

/**
 * Create an empty scan state
 */
export function emptyScanState(): GraphQLScanState {
  return Object.freeze({
    schemas: [],
    resolvers: [],
    directives: [],
    documents: [],
    directiveSchemas: null,
    extendConfigs: [],
    extendSchemas: [],
  })
}

/**
 * Create a scan state from local scan results
 */
export function createScanState(result: {
  schemas: string[]
  resolvers: GenImport[]
  directives: GenImport[]
  documents: string[]
  directiveSchemas: string | null
}): GraphQLScanState {
  return Object.freeze({
    schemas: [...result.schemas],
    resolvers: [...result.resolvers],
    directives: [...result.directives],
    documents: [...result.documents],
    directiveSchemas: result.directiveSchemas,
    extendConfigs: [],
    extendSchemas: [],
  })
}

/**
 * Merge extend results into an existing state, producing a new frozen snapshot.
 * Deduplicates by path/specifier to prevent double-counting.
 */
export function mergeScanState(
  base: GraphQLScanState,
  extend: {
    schemas?: string[]
    resolvers?: GenImport[]
    directives?: GenImport[]
    documents?: string[]
    configPath?: string
    schemaPath?: string
  },
): GraphQLScanState {
  const schemas = [...base.schemas]
  const resolvers = [...base.resolvers]
  const directives = [...base.directives]
  const documents = [...base.documents]
  const extendConfigs = [...base.extendConfigs]
  const extendSchemas = [...base.extendSchemas]

  // Deduplicated merge
  for (const s of extend.schemas || []) {
    if (!schemas.includes(s)) schemas.push(s)
  }
  for (const r of extend.resolvers || []) {
    if (!resolvers.some(existing => existing.specifier === r.specifier)) resolvers.push(r)
  }
  for (const d of extend.directives || []) {
    if (!directives.some(existing => existing.specifier === d.specifier)) directives.push(d)
  }
  for (const doc of extend.documents || []) {
    if (!documents.includes(doc)) documents.push(doc)
  }
  if (extend.configPath && !extendConfigs.includes(extend.configPath)) {
    extendConfigs.push(extend.configPath)
  }
  if (extend.schemaPath && !extendSchemas.includes(extend.schemaPath)) {
    extendSchemas.push(extend.schemaPath)
  }

  return Object.freeze({
    schemas,
    resolvers,
    directives,
    documents,
    directiveSchemas: base.directiveSchemas,
    extendConfigs,
    extendSchemas,
  })
}
