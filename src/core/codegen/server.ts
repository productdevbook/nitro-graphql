/**
 * Server-side type generation
 * Framework-agnostic GraphQL resolver type generation
 */

import type { ServerCodegenConfig, ServerCodegenInput, ServerCodegenResult } from '../types/codegen'
import { codegen } from '@graphql-codegen/core'
import * as typescriptPlugin from '@graphql-codegen/typescript'
import * as typescriptResolversPlugin from '@graphql-codegen/typescript-resolvers'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import { defu } from 'defu'
import { parse } from 'graphql'
import { DEFAULT_GRAPHQL_SCALARS } from '../constants'
import { pluginContent } from './file-header'
import { serverImportsPlugin } from './server-type-helpers'

/**
 * Default server codegen configuration
 */
export const DEFAULT_SERVER_CODEGEN_CONFIG: ServerCodegenConfig = {
  scalars: DEFAULT_GRAPHQL_SCALARS,
  defaultScalarType: 'unknown',
  defaultMapper: `ResolverReturnType<{T}>`,
  contextType: 'nitro/h3#H3Event',
  maybeValue: 'T | null | undefined',
  inputMaybeValue: 'T | undefined',
  declarationKind: 'interface',
  enumsAsTypes: true,
}

/**
 * Generate server-side GraphQL types
 * Pure function that generates TypeScript types from a GraphQL schema
 */
export async function generateServerTypesCore(
  input: ServerCodegenInput,
): Promise<ServerCodegenResult> {
  const { framework, schema, schemaString: inputSchemaString, config = {}, federationEnabled = false, outputPath } = input

  const defaultConfig: ServerCodegenConfig = {
    ...DEFAULT_SERVER_CODEGEN_CONFIG,
    ...(federationEnabled && { federation: true }),
  }

  const mergedConfig = defu(defaultConfig, config)

  const schemaString = inputSchemaString || (schema ? printSchemaWithDirectives(schema) : null)
  if (!schemaString) {
    throw new Error('[generateServerTypesCore] No schema or schemaString provided')
  }

  const types = await codegen({
    filename: outputPath || 'types.generated.ts',
    schema: parse(schemaString),
    documents: [],
    config: mergedConfig,
    plugins: [
      { imports: {} },
      { pluginContent: {} },
      { typescript: {} },
      { typescriptResolvers: {} },
    ],
    pluginMap: {
      pluginContent: { plugin: pluginContent },
      imports: serverImportsPlugin(framework),
      typescript: typescriptPlugin,
      typescriptResolvers: typescriptResolversPlugin,
    },
  })

  return { types, schemaString }
}
