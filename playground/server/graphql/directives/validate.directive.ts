import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLError } from 'graphql'

export const validateDirective = defineDirective({
  name: 'validate',
  locations: ['FIELD_DEFINITION', 'ARGUMENT_DEFINITION'],
  args: {
    minLength: {
      type: 'Int',
      description: 'Minimum length for string values',
    },
    maxLength: {
      type: 'Int',
      description: 'Maximum length for string values',
    },
    pattern: {
      type: 'String',
      description: 'Regex pattern to match',
    },
    min: {
      type: 'Int',
      description: 'Minimum value for numbers',
    },
    max: {
      type: 'Int',
      description: 'Maximum value for numbers',
    },
  },
  description: 'Directive for field validation',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const validateConfig = getDirective(schema, fieldConfig, 'validate')?.[0]

        if (validateConfig) {
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            const result = await resolve(source, args, context, info)

            // String validation
            if (typeof result === 'string') {
              if (validateConfig.minLength && result.length < validateConfig.minLength) {
                throw new GraphQLError(`Value must be at least ${validateConfig.minLength} characters long`)
              }
              if (validateConfig.maxLength && result.length > validateConfig.maxLength) {
                throw new GraphQLError(`Value must be at most ${validateConfig.maxLength} characters long`)
              }
              if (validateConfig.pattern) {
                const regex = new RegExp(validateConfig.pattern)
                if (!regex.test(result)) {
                  throw new GraphQLError(`Value does not match required pattern: ${validateConfig.pattern}`)
                }
              }
            }

            // Number validation
            if (typeof result === 'number') {
              if (validateConfig.min !== undefined && result < validateConfig.min) {
                throw new GraphQLError(`Value must be at least ${validateConfig.min}`)
              }
              if (validateConfig.max !== undefined && result > validateConfig.max) {
                throw new GraphQLError(`Value must be at most ${validateConfig.max}`)
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
