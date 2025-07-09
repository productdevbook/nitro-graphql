import type { Types } from '@graphql-codegen/plugin-helpers'
import type { GraphQLSchema } from 'graphql'
import { codegen } from '@graphql-codegen/core'
import * as typescriptPlugin from '@graphql-codegen/typescript'
import * as typescriptResolversPlugin from '@graphql-codegen/typescript-resolvers'
import { printSchemaWithDirectives } from '@graphql-tools/utils'
import { defu } from 'defu'
import { parse } from 'graphql'
import {
  CurrencyResolver,
  DateTimeResolver,
  JSONResolver,
  NonEmptyStringResolver,
  UUIDResolver,
} from 'graphql-scalars'

export interface CodegenServerConfig {
  contextType?: string
  scalars?: Record<string, any>
  defaultMapper?: string
  mapperTypeSuffix?: string
  [key: string]: any
}

export type GraphQLCodegenPlugin = Types.CodegenPlugin

const pluginContent: GraphQLCodegenPlugin = (_schema, _documents, _config, _info) => {
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
      Boolean: {
        input: 'boolean',
        output: 'boolean',
      },
      DateTime: DateTimeResolver.extensions.codegenScalarType as any,
      DateTimeISO: DateTimeResolver.extensions.codegenScalarType as any,
      UUID: UUIDResolver.extensions.codegenScalarType as any,
      JSON: JSONResolver.extensions.codegenScalarType as any,
      JSONObject: JSONResolver.extensions.codegenScalarType as any,
      NonEmptyString: NonEmptyStringResolver.extensions.codegenScalarType as any,
      Currency: CurrencyResolver.extensions.codegenScalarType as any,
      File: {
        input: 'File',
        output: 'File',
      },
      Cursor: {
        input: 'number',
        output: 'number',
      },
    },
    defaultScalarType: 'unknown',
    defaultMapper: `ResolverReturnType<{T}>`,
    contextType: './context#GraphQLContext',
    maybeValue: 'T | null | undefined',
    inputMaybeValue: 'T | undefined',
    enumsAsTypes: true,
    useTypeImports: true,
    strictScalars: true,
    emitLegacyCommonJSImports: false,
  }

  const mergedConfig = defu(config, defaultConfig)

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
        plugin: () => ({
          prepend: [
            `type Primitive =
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

type ResolverReturnTypeObject<T extends object> = {
  [K in keyof T]: ResolverReturnType<T[K]>
};`,
            '',
          ],
          content: '',
        }),
      },
      typescript: typescriptPlugin,
      typescriptResolvers: typescriptResolversPlugin,
    },
  }).catch((e: any) => {
    console.warn('[nitro-graphql-yoga] Code generation error:', e)
    return ''
  })

  return output
}
