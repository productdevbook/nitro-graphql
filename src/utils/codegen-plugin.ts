/**
 * Shared GraphQL codegen plugin utilities
 */

import type { Source } from '@graphql-tools/utils'
import type { GraphQLSchema } from 'graphql'

/**
 * Plugin to add prepend comments to generated files
 * Used by both server and client codegen
 */
export function pluginContent(
  _schema: GraphQLSchema,
  _documents: Source[],
  _config: Record<string, unknown> | undefined,
  _info: Record<string, unknown> | undefined,
) {
  return {
    prepend: [
      '// THIS FILE IS GENERATED, DO NOT EDIT!',
      '/* eslint-disable eslint-comments/no-unlimited-disable */',
      '/* tslint:disable */',
      '/* eslint-disable */',
      '/* prettier-ignore */',
    ],
    content: '',
  }
}

/**
 * Generate the prepend header for generated files
 * Can be used when creating files manually without codegen
 */
export const GENERATED_FILE_HEADER = `// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
`
