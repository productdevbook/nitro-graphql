/**
 * Server type helpers prepended to generated resolver types
 *
 * These TypeScript types power the ResolverReturnType<T> mapped type
 * that integrates Standard Schema (Zod, Valibot, etc.) validation
 * output types into resolvers.
 */

/**
 * Generate the imports + type helpers prepended to server type output
 */
export function generateServerPrepend(framework: string): string {
  return `import schemas from '#nitro-graphql/validation-schemas'
import type { StandardSchemaV1 } from 'nitro-graphql/types'

export interface NPMConfig {
  framework: '${framework || 'graphql-yoga'}';
}

export type SchemaType = Partial<Record<Partial<keyof ResolversTypes>, StandardSchemaV1>>

// Resolve schema keys safely — returns never for empty schema objects
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

/**
 * Maps resolver return types through Standard Schema validation.
 * When a type's __typename matches a schema key, its output type
 * is inferred from the schema's validation output instead.
 */
type ResolverReturnType<T> = T extends BuiltIns
  ? T
  : T extends (...args: any[]) => unknown
    ? T | undefined
    : T extends object
      ? T extends Array<infer ItemType>
        ? ItemType[] extends T
          ? Array<ResolverReturnType<ItemType>>
          : ResolverReturnTypeObject<T>
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
