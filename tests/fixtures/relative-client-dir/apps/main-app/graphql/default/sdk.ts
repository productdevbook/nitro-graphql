// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import type * as Types from '#graphql/client';

import type { ExecutionResult } from 'graphql';

export const GetAllProductsDocument = /*#__PURE__*/ `
    query GetAllProducts {
  products {
    id
    name
    price
  }
}
    `;
export const GetProductByIdDocument = /*#__PURE__*/ `
    query GetProductById($id: ID!) {
  product(id: $id) {
    id
    name
    price
  }
}
    `;
export type Requester<C = {}, E = unknown> = <R, V>(doc: string, vars?: V, options?: C) => Promise<ExecutionResult<R, E>> | AsyncIterable<ExecutionResult<R, E>>
export function getSdk<C, E>(requester: Requester<C, E>) {
  return {
    GetAllProducts(variables?: Types.GetAllProductsQueryVariables, options?: C): Promise<ExecutionResult<Types.GetAllProductsQuery, E>> {
      return requester<Types.GetAllProductsQuery, Types.GetAllProductsQueryVariables>(GetAllProductsDocument, variables, options) as Promise<ExecutionResult<Types.GetAllProductsQuery, E>>;
    },
    GetProductById(variables: Types.GetProductByIdQueryVariables, options?: C): Promise<ExecutionResult<Types.GetProductByIdQuery, E>> {
      return requester<Types.GetProductByIdQuery, Types.GetProductByIdQueryVariables>(GetProductByIdDocument, variables, options) as Promise<ExecutionResult<Types.GetProductByIdQuery, E>>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;