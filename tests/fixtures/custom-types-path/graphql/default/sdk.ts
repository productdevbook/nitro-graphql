// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import type * as Types from '#graphql/client';

import type { ExecutionResult } from 'graphql';

export const GetUserDocument = /*#__PURE__*/ `
    query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
  }
}
    `;
export const GetHelloDocument = /*#__PURE__*/ `
    query GetHello {
  hello
}
    `;
export type Requester<C = {}, E = unknown> = <R, V>(doc: string, vars?: V, options?: C) => Promise<ExecutionResult<R, E>> | AsyncIterable<ExecutionResult<R, E>>
export function getSdk<C, E>(requester: Requester<C, E>) {
  return {
    GetUser(variables: Types.GetUserQueryVariables, options?: C): Promise<ExecutionResult<Types.GetUserQuery, E>> {
      return requester<Types.GetUserQuery, Types.GetUserQueryVariables>(GetUserDocument, variables, options) as Promise<ExecutionResult<Types.GetUserQuery, E>>;
    },
    GetHello(variables?: Types.GetHelloQueryVariables, options?: C): Promise<ExecutionResult<Types.GetHelloQuery, E>> {
      return requester<Types.GetHelloQuery, Types.GetHelloQueryVariables>(GetHelloDocument, variables, options) as Promise<ExecutionResult<Types.GetHelloQuery, E>>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;