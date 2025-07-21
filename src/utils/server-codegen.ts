import type { GraphQLSchema } from 'graphql'
import type { CodegenServerConfig } from '../types'
import { codegen } from '@graphql-codegen/core'
import * as typescriptPlugin from '@graphql-codegen/typescript'
import * as typescriptResolversPlugin from '@graphql-codegen/typescript-resolvers'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import consola from 'consola'
import { defu } from 'defu'
import { parse } from 'graphql'
import { CurrencyResolver, DateTimeISOResolver, DateTimeResolver, JSONObjectResolver, JSONResolver, NonEmptyStringResolver, UUIDResolver } from 'graphql-scalars'
// import {
//   CurrencyResolver,
//   DateTimeResolver,
//   JSONResolver,
//   NonEmptyStringResolver,
//   UUIDResolver,
// } from 'graphql-scalars'

function pluginContent(_schema: any, _documents: any, _config: any, _info: any) {
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

export async function generateTypes(
  schema: GraphQLSchema,
  config: CodegenServerConfig = {},
  outputPath?: string,
) {
  const defaultConfig: CodegenServerConfig = {
    scalars: {
      DateTime: DateTimeResolver.extensions.codegenScalarType as any,
      DateTimeISO: DateTimeISOResolver.extensions.codegenScalarType as any,
      UUID: UUIDResolver.extensions.codegenScalarType as any,
      JSON: JSONResolver.extensions.codegenScalarType as any,
      JSONObject: JSONObjectResolver.extensions.codegenScalarType as any,
      NonEmptyString: NonEmptyStringResolver.extensions.codegenScalarType as any,
      Currency: CurrencyResolver.extensions.codegenScalarType as any,
      File: {
        input: 'File',
        output: 'File',
      },
    },
    defaultScalarType: 'unknown',
    defaultMapper: `ResolverReturnType<{T}>`,
    contextType: 'h3#H3Event',
    maybeValue: 'T | null | undefined',
    inputMaybeValue: 'T | undefined',
    declarationKind: 'interface',
    enumsAsTypes: true,
  }

  const mergedConfig = defu(defaultConfig, config)

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
              `import type { StandardSchemaV1 } from 'nitro-graphql'`,

              `
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
  }).catch((e: any) => {
    consola.withTag('graphql').error('Error generating types:', e)
    return ''
  })

  return output
}
