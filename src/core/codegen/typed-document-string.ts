/**
 * TypedDocumentString codegen plugin
 *
 * When documentMode is 'string', the generic-sdk plugin generates `new TypedDocumentString(...)`
 * but the import-types-preset only produces `import type` which can't bring in runtime values.
 * This plugin prepends the TypedDocumentString class to make the SDK self-contained.
 *
 * Uses the standard @graphql-codegen plugin API (prepend[] + content) instead of raw
 * string manipulation, ensuring correct ordering and deduplication in the codegen pipeline.
 */

import type { Source } from '@graphql-tools/utils'
import type { GraphQLSchema } from 'graphql'

export function typedDocumentStringPlugin(
  _schema: GraphQLSchema,
  _documents: Source[],
  _config: Record<string, unknown> | undefined,
) {
  return {
    prepend: [
      `import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';`,
      `class TypedDocumentString<TResult, TVariables> extends String implements DocumentTypeDecoration<TResult, TVariables> {`,
      `  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;`,
      `  private __value: string;`,
      `  public __meta__?: Record<string, any> | undefined;`,
      `  constructor(value: string, __meta__?: Record<string, any>) { super(value); this.__value = value; this.__meta__ = __meta__; }`,
      `  override toString(): string & DocumentTypeDecoration<TResult, TVariables> { return this.__value as unknown as string & DocumentTypeDecoration<TResult, TVariables>; }`,
      `}`,
    ],
    content: '',
  }
}
