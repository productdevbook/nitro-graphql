import type { GraphQLFieldConfig, GraphQLSchema } from 'graphql'
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver } from 'graphql'
import { defineDirective } from 'nitro-graphql/define'

export const upperDirective = defineDirective({
  name: 'upper',
  locations: ['FIELD_DEFINITION'],
  transformer: (schema: GraphQLSchema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig: GraphQLFieldConfig<unknown, unknown>) => {
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
})
