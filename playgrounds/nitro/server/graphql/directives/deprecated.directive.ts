import type { GraphQLFieldConfig } from 'graphql'
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defineDirective } from 'nitro-graphql/define'

export const deprecatedFieldDirective = defineDirective({
  name: 'deprecatedField',
  locations: ['FIELD_DEFINITION'],
  args: {
    reason: {
      type: 'String',
      defaultValue: 'No longer supported',
      description: 'Deprecation reason',
    },
    removeAt: {
      type: 'String',
      description: 'Date when the field will be removed (ISO format)',
    },
  },
  description: 'Mark a field as deprecated with additional metadata',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig: GraphQLFieldConfig<any, any>) => {
        const deprecatedConfig = getDirective(schema, fieldConfig, 'deprecatedField')?.[0]

        if (deprecatedConfig) {
          // Set GraphQL deprecation
          fieldConfig.deprecationReason = deprecatedConfig.reason

          // Add removal date to description if provided
          if (deprecatedConfig.removeAt) {
            const originalDescription = fieldConfig.description || ''
            fieldConfig.description = `${originalDescription}\n⚠️ Will be removed at: ${deprecatedConfig.removeAt}`
          }

          // Log deprecation warnings in development
          if (process.env.NODE_ENV === 'development') {
            const originalResolve = fieldConfig.resolve || ((source, args, context, info) => source[info.fieldName])
            fieldConfig.resolve = async (source, args, context, info) => {
              console.warn(`⚠️ Deprecated field accessed: ${info.parentType.name}.${info.fieldName} - ${deprecatedConfig.reason}`)
              return originalResolve(source, args, context, info)
            }
          }
        }

        return fieldConfig
      },
    })
  },
})
