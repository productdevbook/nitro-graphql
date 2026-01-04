/**
 * Shared helpers for directive transformer tests
 */
import type { DirectiveDefinition } from '../../../src/core/types/define'
import { createMergedSchema } from '../../../src/core/schema/builder'

// Import from graphql-tools (uses same graphql instance as createMergedSchema)
const { defaultFieldResolver } = await import('graphql')
const { getDirective, MapperKind, mapSchema } = await import('@graphql-tools/utils')

/** @upper directive for testing - transforms string fields to uppercase */
export const upperDirective: DirectiveDefinition = {
  name: 'upper',
  locations: ['FIELD_DEFINITION'],
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, 'upper')?.[0]
        if (directive) {
          const { resolve = defaultFieldResolver } = fieldConfig
          fieldConfig.resolve = async (source, args, context, info) => {
            const result = await resolve(source, args, context, info)
            return typeof result === 'string' ? result.toUpperCase() : result
          }
        }
        return fieldConfig
      },
    })
  },
}

/** GraphQL SDL definition for @upper directive */
export const upperDirectiveSchema = 'directive @upper on FIELD_DEFINITION'

/** Create a test schema with @upper directive */
export async function createTestSchema(schemaFields: string, resolvers: Record<string, unknown>) {
  return createMergedSchema({
    schemas: [
      {
        def: `
          ${upperDirectiveSchema}

          type Query {
            ${schemaFields}
          }
        `,
      },
    ],
    resolvers: [
      {
        resolver: {
          Query: resolvers,
        },
      },
    ],
    directives: [
      { directive: upperDirective },
    ],
    moduleConfig: {},
  })
}
