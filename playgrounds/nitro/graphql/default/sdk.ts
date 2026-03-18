// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import type * as Types from '#graphql/client';

import type { DocumentNode, ExecutionResult } from 'graphql';
import gql from 'graphql-tag';

export const HelloDocument = /*#__PURE__*/ gql`
    query Hello {
  helloCI
}
    `;
export const GetUsersDocument = /*#__PURE__*/ gql`
    query GetUsers {
  users {
    id
    name
  }
}
    `;
export const GetGreetingDocument = /*#__PURE__*/ gql`
    query GetGreeting {
  greeting(name: "World")
}
    `;
export type Requester<C = {}, E = unknown> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<ExecutionResult<R, E>> | AsyncIterable<ExecutionResult<R, E>>
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