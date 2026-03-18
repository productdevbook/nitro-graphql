/**
 * Generated file header — single source of truth
 * Used as both a @graphql-codegen plugin (prepend[]) and a standalone constant
 */

import type { Source } from '@graphql-tools/utils'
import type { GraphQLSchema } from 'graphql'

const HEADER_LINES = [
  '// THIS FILE IS GENERATED, DO NOT EDIT!',
  '/* eslint-disable eslint-comments/no-unlimited-disable */',
  '/* tslint:disable */',
  '/* eslint-disable */',
  '/* prettier-ignore */',
] as const

/**
 * Codegen plugin that prepends the standard header to generated files
 */
export function pluginContent(
  _schema: GraphQLSchema,
  _documents: Source[],
  _config: Record<string, unknown> | undefined,
  _info: Record<string, unknown> | undefined,
) {
  return {
    prepend: [...HEADER_LINES],
    content: '',
  }
}

/**
 * Standalone header string for files created outside the codegen pipeline
 */
export const GENERATED_FILE_HEADER = `${HEADER_LINES.join('\n')}\n`
