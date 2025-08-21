// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import type * as Types from '#graphql/client/countries';

import type { ExecutionResult } from 'graphql';

export const GetCountriesDocument = /*#__PURE__*/ `
    query GetCountries {
  countries {
    code
    name
    emoji
    continent {
      name
    }
  }
}
    `;
export const GetCountryDocument = /*#__PURE__*/ `
    query GetCountry($code: ID!) {
  country(code: $code) {
    code
    name
    emoji
    phone
    capital
    currency
    native
    continent {
      name
      code
    }
    languages {
      name
      code
    }
  }
}
    `;
export type Requester<C = {}, E = unknown> = <R, V>(doc: string, vars?: V, options?: C) => Promise<ExecutionResult<R, E>> | AsyncIterable<ExecutionResult<R, E>>
export function getSdk<C, E>(requester: Requester<C, E>) {
  return {
    GetCountries(variables?: Types.GetCountriesQueryVariables, options?: C): Promise<ExecutionResult<Types.GetCountriesQuery, E>> {
      return requester<Types.GetCountriesQuery, Types.GetCountriesQueryVariables>(GetCountriesDocument, variables, options) as Promise<ExecutionResult<Types.GetCountriesQuery, E>>;
    },
    GetCountry(variables: Types.GetCountryQueryVariables, options?: C): Promise<ExecutionResult<Types.GetCountryQuery, E>> {
      return requester<Types.GetCountryQuery, Types.GetCountryQueryVariables>(GetCountryDocument, variables, options) as Promise<ExecutionResult<Types.GetCountryQuery, E>>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;