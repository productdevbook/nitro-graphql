/**
 * TypedDocumentString class definition
 *
 * When documentMode is 'string', the generic-sdk plugin generates `new TypedDocumentString(...)`.
 * The import-types-preset only produces `import type` which can't bring in runtime values,
 * so we prepend the class directly to make the SDK self-contained.
 */

export const TYPED_DOCUMENT_STRING_CLASS = `import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
class TypedDocumentString<TResult, TVariables> extends String implements DocumentTypeDecoration<TResult, TVariables> {
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private __value: string;
  public __meta__?: Record<string, any> | undefined;
  constructor(value: string, __meta__?: Record<string, any>) { super(value); this.__value = value; this.__meta__ = __meta__; }
  override toString(): string & DocumentTypeDecoration<TResult, TVariables> { return this.__value as unknown as string & DocumentTypeDecoration<TResult, TVariables>; }
}
`
