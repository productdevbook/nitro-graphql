// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import type * as Types from '#graphql/client';

import type { ExecutionResult } from 'graphql';

export const GetUsersDocument = /*#__PURE__*/ `
    query GetUsers {
  hello
}
    `;
export type Requester<C = {}, E = unknown> = <R, V>(doc: string, vars?: V, options?: C) => Promise<ExecutionResult<R, E>> | AsyncIterable<ExecutionResult<R, E>>
export function getSdk<C, E>(requester: Requester<C, E>) {
  return {
    GetUsers(variables?: Types.GetUsersQueryVariables, options?: C): Promise<ExecutionResult<Types.GetUsersQuery, E>> {
      return requester<Types.GetUsersQuery, Types.GetUsersQueryVariables>(GetUsersDocument, variables, options) as Promise<ExecutionResult<Types.GetUsersQuery, E>>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;