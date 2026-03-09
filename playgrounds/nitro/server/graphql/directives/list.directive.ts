import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver } from 'graphql'
import { defineDirective } from 'nitro-graphql/define'

/**
 * @list directive - Apply operations to array/list fields
 *
 * Examples:
 * - @list(max: 10) - Limit array to first 10 items
 * - @list(sort: "name") - Sort array by field
 * - @list(filter: "active") - Filter array by boolean field
 * - @list(reverse: true) - Reverse array order
 * - @list(unique: "id") - Remove duplicates by field
 */
export const listDirective = defineDirective({
  name: 'list',
  locations: ['FIELD_DEFINITION'],
  args: {
    max: {
      type: 'Int',
      description: 'Maximum number of items to return',
    },
    sort: {
      type: 'String',
      description: 'Field name to sort by',
    },
    sortDesc: {
      type: 'Boolean',
      defaultValue: false,
      description: 'Sort in descending order',
    },
    filter: {
      type: 'String',
      description: 'Field name to filter by (must be truthy)',
    },
    reverse: {
      type: 'Boolean',
      defaultValue: false,
      description: 'Reverse the array order',
    },
    unique: {
      type: 'String',
      description: 'Field name to use for uniqueness',
    },
  },
  description: 'Apply array/list operations',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const listDirective = getDirective(schema, fieldConfig, 'list')?.[0]
        if (listDirective) {
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            let result = await resolve(source, args, context, info)

            // Only process if result is an array
            if (!Array.isArray(result)) {
              return result
            }

            // Apply filter
            if (listDirective.filter && result.length > 0) {
              result = result.filter(item =>
                item && typeof item === 'object' && item[listDirective.filter],
              )
            }

            // Apply unique
            if (listDirective.unique && result.length > 0) {
              const seen = new Set()
              result = result.filter((item) => {
                if (item && typeof item === 'object' && item[listDirective.unique]) {
                  const key = item[listDirective.unique]
                  if (seen.has(key))
                    return false
                  seen.add(key)
                  return true
                }
                return true
              })
            }

            // Apply sort
            if (listDirective.sort && result.length > 0) {
              result = result.toSorted((a, b) => {
                const aVal = a?.[listDirective.sort]
                const bVal = b?.[listDirective.sort]

                if (aVal < bVal)
                  return listDirective.sortDesc ? 1 : -1
                if (aVal > bVal)
                  return listDirective.sortDesc ? -1 : 1
                return 0
              })
            }

            // Apply reverse
            if (listDirective.reverse) {
              result = result.toReversed()
            }

            // Apply max limit
            if (listDirective.max && result.length > listDirective.max) {
              result = result.slice(0, listDirective.max)
            }

            return result
          }
        }

        return fieldConfig
      },
    })
  },
})
