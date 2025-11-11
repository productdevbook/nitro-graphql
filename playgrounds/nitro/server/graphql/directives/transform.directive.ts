import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver } from 'graphql'
import { defineDirective } from 'nitro-graphql/define'

export const transformDirective = defineDirective({
  name: 'transform',
  locations: ['FIELD_DEFINITION', 'ARGUMENT_DEFINITION'],
  args: {
    upper: {
      type: 'Boolean',
      description: 'Transform to uppercase',
    },
    lower: {
      type: 'Boolean',
      description: 'Transform to lowercase',
    },
    trim: {
      type: 'Boolean',
      defaultValue: true,
      description: 'Trim whitespace',
    },
    truncate: {
      type: 'Int',
      description: 'Truncate to specified length',
    },
    default: {
      type: 'String',
      description: 'Default value if null or empty',
    },
  },
  description: 'Transform string field values',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const transformConfig = getDirective(schema, fieldConfig, 'transform')?.[0]

        if (transformConfig) {
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            let result = await resolve(source, args, context, info)

            // Handle null/undefined with default
            if ((result === null || result === undefined || result === '') && transformConfig.default) {
              result = transformConfig.default
            }

            // Apply string transformations
            if (typeof result === 'string') {
              if (transformConfig.trim) {
                result = result.trim()
              }
              if (transformConfig.upper) {
                result = result.toUpperCase()
              }
              if (transformConfig.lower) {
                result = result.toLowerCase()
              }
              if (transformConfig.truncate && result.length > transformConfig.truncate) {
                result = `${result.substring(0, transformConfig.truncate)}...`
              }
            }

            return result
          }
        }

        return fieldConfig
      },
    })
  },
})
