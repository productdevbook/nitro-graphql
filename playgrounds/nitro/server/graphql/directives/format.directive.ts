import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver } from 'graphql'
import { defineDirective } from 'nitro-graphql/define'

const UPPERCASE_LETTER_RE = /([A-Z])/g
const UNDERSCORE_LOWERCASE_RE = /_([a-z])/g
const LEADING_UNDERSCORE_RE = /^_/

/**
 * @format directive - Apply multiple formatting operations
 *
 * Examples:
 * - @format(operations: ["UPPERCASE", "TRIM"]) - Apply operations in order
 * - @format(operations: ["LOWERCASE", "SNAKE_CASE"]) - Convert to lowercase snake_case
 * - @format(operations: ["TRIM", "CAPITALIZE"]) - Trim and capitalize
 * - @format(dateFormats: ["ISO", "TIMESTAMP"]) - Return date in multiple formats
 */
export const formatDirective = defineDirective({
  name: 'format',
  locations: ['FIELD_DEFINITION'],
  args: {
    operations: {
      type: '[String!]',
      description: 'Array of formatting operations: UPPERCASE, LOWERCASE, TRIM, CAPITALIZE, SNAKE_CASE, CAMEL_CASE',
    },
    dateFormats: {
      type: '[String!]',
      description: 'Array of date formats: ISO, TIMESTAMP, DATE_ONLY, TIME_ONLY',
    },
    customPatterns: {
      type: '[String!]',
      description: 'Array of custom regex patterns for validation',
    },
  },
  description: 'Apply multiple formatting operations',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const formatConfig = getDirective(schema, fieldConfig, 'format')?.[0]

        if (formatConfig) {
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            let result = await resolve(source, args, context, info)

            // Apply string operations
            if (formatConfig.operations && typeof result === 'string') {
              for (const operation of formatConfig.operations) {
                switch (operation) {
                  case 'UPPERCASE':
                    result = result.toUpperCase()
                    break
                  case 'LOWERCASE':
                    result = result.toLowerCase()
                    break
                  case 'TRIM':
                    result = result.trim()
                    break
                  case 'CAPITALIZE':
                    result = result.charAt(0).toUpperCase() + result.slice(1).toLowerCase()
                    break
                  case 'SNAKE_CASE':
                    result = result.replace(UPPERCASE_LETTER_RE, '_$1').toLowerCase().replace(LEADING_UNDERSCORE_RE, '')
                    break
                  case 'CAMEL_CASE':
                    result = result.replace(UNDERSCORE_LOWERCASE_RE, (_, letter) => letter.toUpperCase())
                    break
                }
              }
            }

            // Apply date formats
            if (formatConfig.dateFormats && result instanceof Date) {
              const formats = {}
              for (const format of formatConfig.dateFormats) {
                switch (format) {
                  case 'ISO':
                    formats.iso = result.toISOString()
                    break
                  case 'TIMESTAMP':
                    formats.timestamp = result.getTime()
                    break
                  case 'DATE_ONLY':
                    formats.dateOnly = result.toISOString().split('T')[0]
                    break
                  case 'TIME_ONLY':
                    formats.timeOnly = result.toISOString().split('T')[1]
                    break
                }
              }
              return formats
            }

            // Validate against custom patterns
            if (formatConfig.customPatterns && typeof result === 'string') {
              for (const pattern of formatConfig.customPatterns) {
                const regex = new RegExp(pattern)
                if (!regex.test(result)) {
                  console.warn(`Value "${result}" does not match pattern: ${pattern}`)
                }
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
