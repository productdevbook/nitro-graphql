// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import type * as Types from '#graphql/client';

import type { ExecutionResult } from 'graphql';

export const CreateUserDocument = /*#__PURE__*/ `
    mutation createUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
    createdAt
  }
}
    `;
export const UpdateUserDocument = /*#__PURE__*/ `
    mutation updateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
    id
    name
    email
    createdAt
  }
}
    `;
export const DeleteUserDocument = /*#__PURE__*/ `
    mutation deleteUser($id: ID!) {
  deleteUser(id: $id)
}
    `;
export const GetUsersDocument = /*#__PURE__*/ `
    query GetUsers {
  users {
    id
    name
    email
    createdAt
  }
}
    `;
export const GetUserDocument = /*#__PURE__*/ `
    query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    createdAt
  }
}
    `;
export type Requester<C = {}, E = unknown> = <R, V>(doc: string, vars?: V, options?: C) => Promise<ExecutionResult<R, E>> | AsyncIterable<ExecutionResult<R, E>>
export function getSdk<C, E>(requester: Requester<C, E>) {
  return {
    createUser(variables: Types.CreateUserMutationVariables, options?: C): Promise<ExecutionResult<Types.CreateUserMutation, E>> {
      return requester<Types.CreateUserMutation, Types.CreateUserMutationVariables>(CreateUserDocument, variables, options) as Promise<ExecutionResult<Types.CreateUserMutation, E>>;
    },
    updateUser(variables: Types.UpdateUserMutationVariables, options?: C): Promise<ExecutionResult<Types.UpdateUserMutation, E>> {
      return requester<Types.UpdateUserMutation, Types.UpdateUserMutationVariables>(UpdateUserDocument, variables, options) as Promise<ExecutionResult<Types.UpdateUserMutation, E>>;
    },
    deleteUser(variables: Types.DeleteUserMutationVariables, options?: C): Promise<ExecutionResult<Types.DeleteUserMutation, E>> {
      return requester<Types.DeleteUserMutation, Types.DeleteUserMutationVariables>(DeleteUserDocument, variables, options) as Promise<ExecutionResult<Types.DeleteUserMutation, E>>;
    },
    GetUsers(variables?: Types.GetUsersQueryVariables, options?: C): Promise<ExecutionResult<Types.GetUsersQuery, E>> {
      return requester<Types.GetUsersQuery, Types.GetUsersQueryVariables>(GetUsersDocument, variables, options) as Promise<ExecutionResult<Types.GetUsersQuery, E>>;
    },
    GetUser(variables: Types.GetUserQueryVariables, options?: C): Promise<ExecutionResult<Types.GetUserQuery, E>> {
      return requester<Types.GetUserQuery, Types.GetUserQueryVariables>(GetUserDocument, variables, options) as Promise<ExecutionResult<Types.GetUserQuery, E>>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;