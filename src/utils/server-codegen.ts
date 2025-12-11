import type { GraphQLSchema } from 'graphql'
import type { CodegenServerConfig, NitroGraphQLOptions } from '../types'
import { codegen } from '@graphql-codegen/core'
import * as typescriptPlugin from '@graphql-codegen/typescript'
import * as typescriptResolversPlugin from '@graphql-codegen/typescript-resolvers'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import consola from 'consola'
import { defu } from 'defu'
import { parse } from 'graphql'
import { DEFAULT_GRAPHQL_SCALARS } from '../constants/scalars'
import { pluginContent } from './codegen-plugin'

export async function generateTypes(
  selectFremework: string,
  schema: GraphQLSchema,
  config: Partial<NitroGraphQLOptions> = {},
  outputPath?: string,
) {
  const defaultConfig: CodegenServerConfig = {
    scalars: DEFAULT_GRAPHQL_SCALARS,
    defaultScalarType: 'unknown',
    defaultMapper: `ResolverReturnType<{T}>`,
    contextType: 'nitro/h3#H3Event',
    maybeValue: 'T | null | undefined',
    inputMaybeValue: 'T | undefined',
    declarationKind: 'interface',
    enumsAsTypes: true,
    ...(config.federation?.enabled && { federation: true }),
  }

  const mergedConfig = defu(defaultConfig, config.codegen?.server)

  const output = await codegen({
    filename: outputPath || 'types.generated.ts',
    schema: parse(printSchemaWithDirectives(schema)),
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
              `import schemas from '#graphql/schema'`,
              `import type { StandardSchemaV1 } from 'nitro-graphql/types'`,

              `
export interface NPMConfig {
  framework: '${selectFremework || 'graphql-yoga'}';
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
`,
              '',
            ],
            content: '',
          }
        },
      },
      typescript: typescriptPlugin,
      typescriptResolvers: typescriptResolversPlugin,
    },
  }).catch((e: unknown) => {
    consola.withTag('graphql').error('Error generating types:', e)
    return ''
  })

  return output
}
