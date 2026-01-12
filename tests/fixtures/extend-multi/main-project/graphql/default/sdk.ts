// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import type * as Types from '#graphql/client';

import type { ExecutionResult } from 'graphql';

export const GetProductsDocument = /*#__PURE__*/ `
    query GetProducts {
  products {
    id
    name
    price
  }
}
    `;
export const GetAllProductsDocument = /*#__PURE__*/ `
    query GetAllProducts {
  products {
    id
    name
    price
  }
}
    `;
export type Requester<C = {}, E = unknown> = <R, V>(doc: string, vars?: V, options?: C) => Promise<ExecutionResult<R, E>> | AsyncIterable<ExecutionResult<R, E>>
export function getSdk<C, E>(requester: Requester<C, E>) {
  return {
    GetProducts(variables?: Types.GetProductsQueryVariables, options?: C): Promise<ExecutionResult<Types.GetProductsQuery, E>> {
      return requester<Types.GetProductsQuery, Types.GetProductsQueryVariables>(GetProductsDocument, variables, options) as Promise<ExecutionResult<Types.GetProductsQuery, E>>;
    },
    GetAllProducts(variables?: Types.GetAllProductsQueryVariables, options?: C): Promise<ExecutionResult<Types.GetAllProductsQuery, E>> {
      return requester<Types.GetAllProductsQuery, Types.GetAllProductsQueryVariables>(GetAllProductsDocument, variables, options) as Promise<ExecutionResult<Types.GetAllProductsQuery, E>>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;