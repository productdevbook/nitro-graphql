/**
 * Subscription operation extractor
 * Pure GraphQL utility — no framework dependencies
 */

import type { Source } from '@graphql-tools/utils'
import type { FieldNode, OperationDefinitionNode, SelectionNode } from 'graphql'
import { Kind } from 'graphql'
import { capitalize } from '../utils/string'

/**
 * Subscription info extracted from GraphQL documents
 */
export interface SubscriptionInfo {
  /** Original operation name from GraphQL document (used for method names) */
  name: string
  /** PascalCase version for type references (matches GraphQL codegen output) */
  typeName: string
  fieldName: string
  hasVariables: boolean
}

/**
 * Extract subscription operations from GraphQL documents
 */
export function extractSubscriptions(docs: Source[]): SubscriptionInfo[] {
  const subscriptions: SubscriptionInfo[] = []

  for (const doc of docs) {
    if (!doc.document)
      continue

    for (const def of doc.document.definitions) {
      if (def.kind === Kind.OPERATION_DEFINITION && def.operation === 'subscription') {
        const operationDef = def as OperationDefinitionNode
        const name = operationDef.name?.value
        if (!name)
          continue

        // Get the first field selection to determine the subscription field name
        const firstSelection = operationDef.selectionSet.selections[0] as SelectionNode
        if (firstSelection.kind !== Kind.FIELD)
          continue

        const fieldName = (firstSelection as FieldNode).name.value
        const hasVariables = (operationDef.variableDefinitions?.length || 0) > 0

        subscriptions.push({
          name,
          typeName: capitalize(name),
          fieldName,
          hasVariables,
        })
      }
    }
  }

  return subscriptions
}
