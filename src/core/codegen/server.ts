/**
 * Server-side type generation
 * Framework-agnostic GraphQL resolver type generation
 */

import type { GraphQLSchema } from 'graphql'
import type { ServerCodegenConfig, ServerCodegenInput, ServerCodegenResult } from '../types/codegen'
import { codegen } from '@graphql-codegen/core'
import * as typescriptPlugin from '@graphql-codegen/typescript'
import * as typescriptResolversPlugin from '@graphql-codegen/typescript-resolvers'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import { defu } from 'defu'
import { parse } from 'graphql'
import { DEFAULT_GRAPHQL_SCALARS } from '../constants'
import { pluginContent } from './plugin'

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
  const { framework, schema, config = {}, federationEnabled = false, outputPath } = input

  const defaultConfig: ServerCodegenConfig = {
    ...DEFAULT_SERVER_CODEGEN_CONFIG,
    ...(federationEnabled && { federation: true }),
  }

  const mergedConfig = defu(defaultConfig, config)

  const schemaString = printSchemaWithDirectives(schema)

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
      pluginContent: {
        plugin: pluginContent,
      },
      imports: {
        plugin: () => {
          return {
            prepend: [
              `import schemas from '#nitro-graphql/validation-schemas'`,
              `import type { StandardSchemaV1 } from 'nitro-graphql/types'`,
              generateServerTypeHelpers(framework),
              '',
            ],
            content: '',
          }
        },
      },
      typescript: typescriptPlugin,
      typescriptResolvers: typescriptResolversPlugin,
    },
  })

  return {
    types,
    schemaString,
  }
}

/**
 * Generate server type helper code
 */
function generateServerTypeHelpers(framework: string): string {
  return `
export interface NPMConfig {
  framework: '${framework || 'graphql-yoga'}';
}

export type SchemaType = Partial<Record<Partial<keyof ResolversTypes>, StandardSchemaV1>>

// Check if schemas is empty object, return never if so
type SafeSchemaKeys<T> = T extends Record<PropertyKey, never>
  ? never
  : keyof T extends string | number | symbol
    ? keyof T extends never
      ? never
      : keyof T
    : never;


type SchemaKeys = SafeSchemaKeys<typeof schemas>;

type InferInput<T> = T extends StandardSchemaV1 ? StandardSchemaV1.InferInput<T> : unknown;
type InferOutput<T> = T extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<T> : unknown;

type InferInputFromSchema<T extends SchemaKeys> = InferInput<(typeof schemas)[T]>;
type InferOutputFromSchema<T extends SchemaKeys> = InferOutput<(typeof schemas)[T]>;

type Primitive =
| null
| undefined
| string
| number
| boolean
| symbol
| bigint;

type BuiltIns = Primitive | void | Date | RegExp;


type ResolverReturnType<T> = T extends BuiltIns
? T
: T extends (...args: any[]) => unknown
? T | undefined
: T extends object
? T extends Array<infer ItemType> // Test for arrays/tuples, per https://github.com/microsoft/TypeScript/issues/35156
  ? ItemType[] extends T // Test for arrays (non-tuples) specifically
    ? Array<ResolverReturnType<ItemType>>
    : ResolverReturnTypeObject<T> // Tuples behave properly
  : ResolverReturnTypeObject<T>
: unknown;

type ResolverReturnTypeObject<T extends object> =
  T extends { __typename?: infer TTypename }
    ? TTypename extends SchemaKeys
      ? InferOutputFromSchema<TTypename>
      : { [K in keyof T]: ResolverReturnType<T[K]> }
    : { [K in keyof T]: ResolverReturnType<T[K]> };
`
}

/**
 * Generate types from schema (simplified version for direct use)
 * @deprecated Use generateServerTypesCore instead
 */
export async function generateTypes(
  framework: string,
  schema: GraphQLSchema,
  config: { codegen?: { server?: ServerCodegenConfig }, federation?: { enabled?: boolean } } = {},
  outputPath?: string,
): Promise<string> {
  const result = await generateServerTypesCore({
    framework,
    schema,
    config: config.codegen?.server,
    federationEnabled: config.federation?.enabled,
    outputPath,
  })
  return result.types
}
