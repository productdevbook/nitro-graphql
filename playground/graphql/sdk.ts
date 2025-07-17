// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import type * as Types from '#graphql/client';

export type GetUsersQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type GetUsersQuery = { __typename?: 'Query', hello: string };


export const GetUsersDocument = /*#__PURE__*/ `
    query GetUsers {
  hello
}
    `;
export type Requester<C = {}> = <R, V>(doc: string, vars?: V, options?: C) => Promise<R> | AsyncIterable<R>
export function getSdk<C>(requester: Requester<C>) {
  return {
    GetUsers(variables?: Types.GetUsersQueryVariables, options?: C): Promise<Types.GetUsersQuery> {
      return requester<Types.GetUsersQuery, Types.GetUsersQueryVariables>(GetUsersDocument, variables, options) as Promise<Types.GetUsersQuery>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;