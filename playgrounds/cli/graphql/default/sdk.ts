// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import type * as Types from '#graphql/client';

import type { ExecutionResult } from 'graphql';

export const HelloDocument = /*#__PURE__*/ `
    query Hello {
  helloCI
}
    `;
export type Requester<C = {}, E = unknown> = <R, V>(doc: string, vars?: V, options?: C) => Promise<ExecutionResult<R, E>> | AsyncIterable<ExecutionResult<R, E>>
export function getSdk<C, E>(requester: Requester<C, E>) {
  return {
    Hello(variables?: Types.HelloQueryVariables, options?: C): Promise<ExecutionResult<Types.HelloQuery, E>> {
      return requester<Types.HelloQuery, Types.HelloQueryVariables>(HelloDocument, variables, options) as Promise<ExecutionResult<Types.HelloQuery, E>>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;