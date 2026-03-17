// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import type * as Types from '#graphql/client';

import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
import type { ExecutionResult } from 'graphql';
class TypedDocumentString<TResult, TVariables> extends String implements DocumentTypeDecoration<TResult, TVariables> {
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private __value: string;
  public __meta__?: Record<string, any> | undefined;
  constructor(value: string, __meta__?: Record<string, any>) { super(value); this.__value = value; this.__meta__ = __meta__; }
  override toString(): string & DocumentTypeDecoration<TResult, TVariables> { return this.__value as unknown as string & DocumentTypeDecoration<TResult, TVariables>; }
}

export const HelloDocument = /*#__PURE__*/ new TypedDocumentString(`
    query Hello {
  helloCI
}
    `);
export const GetUsersDocument = /*#__PURE__*/ new TypedDocumentString(`
    query GetUsers {
  users {
    id
    name
  }
}
    `);
export const GetGreetingDocument = /*#__PURE__*/ new TypedDocumentString(`
    query GetGreeting {
  greeting(name: "World")
}
    `);
export type Requester<C = {}, E = unknown> = <R, V>(doc: string, vars?: V, options?: C) => Promise<ExecutionResult<R, E>> | AsyncIterable<ExecutionResult<R, E>>
export function getSdk<C, E>(requester: Requester<C, E>) {
  return {
    Hello(variables?: Types.HelloQueryVariables, options?: C): Promise<ExecutionResult<Types.HelloQuery, E>> {
      return requester<Types.HelloQuery, Types.HelloQueryVariables>(HelloDocument, variables, options) as Promise<ExecutionResult<Types.HelloQuery, E>>;
    },
    GetUsers(variables?: Types.GetUsersQueryVariables, options?: C): Promise<ExecutionResult<Types.GetUsersQuery, E>> {
      return requester<Types.GetUsersQuery, Types.GetUsersQueryVariables>(GetUsersDocument, variables, options) as Promise<ExecutionResult<Types.GetUsersQuery, E>>;
    },
    GetGreeting(variables?: Types.GetGreetingQueryVariables, options?: C): Promise<ExecutionResult<Types.GetGreetingQuery, E>> {
      return requester<Types.GetGreetingQuery, Types.GetGreetingQueryVariables>(GetGreetingDocument, variables, options) as Promise<ExecutionResult<Types.GetGreetingQuery, E>>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;