/**
 * GraphQL schema validation utilities
 * Validates schemas for duplicate type definitions and conflicts
 */

import { mergeTypeDefs } from '@graphql-tools/merge'
import consola from 'consola'
import { parse } from 'graphql'
import { basename } from 'pathe'
import { BUILTIN_SCALARS } from '../constants'

/**
 * Check for duplicate type definitions using a simpler approach
 * Try to build each schema individually - if that succeeds but merging fails, we have duplicates
 * @returns true if validation passes, false if duplicates found
 */
export function validateNoDuplicateTypes(schemas: string[], schemaStrings: string[]): boolean {
  // Build individual schemas first to check if they're valid individually
  const individualSchemasByFile = new Map<string, string>()

  schemaStrings.forEach((schemaContent, index) => {
    const schemaPath = schemas[index]!
    const fileName = basename(schemaPath)

    try {
      // Try to parse each schema individually
      parse(schemaContent)
      individualSchemasByFile.set(fileName, schemaContent)
    }
    catch (error) {
      consola.warn(`Invalid GraphQL syntax in ${fileName}:`, error)
      throw error
    }
  })

  // Try to merge without throwOnConflict first - if this succeeds but we know we have duplicate
  // type names, that means GraphQL is silently merging them
  try {
    // Try merge without conflict check first
    mergeTypeDefs([schemaStrings.join('\n\n')], {
      throwOnConflict: false,
      commentDescriptions: true,
      sort: true,
    })

    // Now try with throwOnConflict - this should catch field conflicts
    mergeTypeDefs([schemaStrings.join('\n\n')], {
      throwOnConflict: true,
      commentDescriptions: true,
      sort: true,
    })
  }
  catch (conflictError: unknown) {
    const error = conflictError as Error
    // If we get a field conflict error, that's good - it means throwOnConflict is working
    // Re-throw it with better context
    if (error?.message?.includes('already defined with a different type')) {
      throw conflictError
    }
  }

  // Manual duplicate type name detection
  const typeNames = new Set<string>()
  const duplicateTypes: Array<{ type: string, files: string[] }> = []

  schemaStrings.forEach((schemaContent, index) => {
    const fileName = basename(schemas[index]!)

    try {
      const document = parse(schemaContent)

      document.definitions.forEach((def) => {
        if (def.kind === 'ObjectTypeDefinition'
          || def.kind === 'InterfaceTypeDefinition'
          || def.kind === 'UnionTypeDefinition'
          || def.kind === 'EnumTypeDefinition'
          || def.kind === 'InputObjectTypeDefinition'
          || def.kind === 'ScalarTypeDefinition') {
          const typeName = def.name.value

          // Skip built-in scalars
          if ((BUILTIN_SCALARS as readonly string[]).includes(typeName)) {
            return
          }

          if (typeNames.has(typeName)) {
            // Found a duplicate
            const existing = duplicateTypes.find(d => d.type === typeName)
            if (existing) {
              existing.files.push(fileName)
            }
            else {
              // Find which file had it first
              const firstFile = schemas.find((_, i) => {
                const content = schemaStrings[i]
                if (!content)
                  return false
                try {
                  const doc = parse(content)
                  return doc.definitions.some(d =>
                    (d.kind === 'ObjectTypeDefinition'
                      || d.kind === 'InterfaceTypeDefinition'
                      || d.kind === 'UnionTypeDefinition'
                      || d.kind === 'EnumTypeDefinition'
                      || d.kind === 'InputObjectTypeDefinition'
                      || d.kind === 'ScalarTypeDefinition')
                    && d.name.value === typeName,
                  )
                }
                catch {
                  return false
                }
              })
              duplicateTypes.push({
                type: typeName,
                files: [basename(firstFile || ''), fileName],
              })
            }
          }
          else {
            typeNames.add(typeName)
          }
        }
      })
    }
    catch {
      // Already handled above
    }
  })

  if (duplicateTypes.length > 0) {
    // Build a comprehensive error message
    let errorMessage = '⚠️  DUPLICATE TYPE DEFINITIONS DETECTED!\n\n'

    duplicateTypes.forEach(({ type, files }) => {
      errorMessage += `❌ Type "${type}" is defined in multiple files:\n`

      // Show full file paths for each duplicate
      files.forEach((fileName) => {
        const fullPath = schemas.find(path => basename(path) === fileName) || fileName
        errorMessage += `   • ${fullPath}\n`
      })
      errorMessage += '\n'
    })

    errorMessage += '💡 Each GraphQL type should only be defined once.\n'
    errorMessage += '   Consider using "extend type" syntax instead of duplicate definitions.\n'
    errorMessage += `\n🔍 Found ${duplicateTypes.length} duplicate type(s): ${duplicateTypes.map(d => d.type).join(', ')}`

    consola.error(errorMessage)
    return false // Validation failed
  }

  return true // Validation passed
}
