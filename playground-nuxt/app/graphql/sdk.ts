// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import type * as Types from '#graphql/client';


export const CreateUserDocument = /*#__PURE__*/ `
    mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
    createdAt
  }
}
    `;
export const UpdateUserDocument = /*#__PURE__*/ `
    mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
    id
    name
    email
    createdAt
  }
}
    `;
export const DeleteUserDocument = /*#__PURE__*/ `
    mutation DeleteUser($id: ID!) {
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
export type Requester<C = {}> = <R, V>(doc: string, vars?: V, options?: C) => Promise<R> | AsyncIterable<R>
export function getSdk<C>(requester: Requester<C>) {
  return {
    CreateUser(variables: Types.CreateUserMutationVariables, options?: C): Promise<Types.CreateUserMutation> {
      return requester<Types.CreateUserMutation, Types.CreateUserMutationVariables>(CreateUserDocument, variables, options) as Promise<Types.CreateUserMutation>;
    },
    UpdateUser(variables: Types.UpdateUserMutationVariables, options?: C): Promise<Types.UpdateUserMutation> {
      return requester<Types.UpdateUserMutation, Types.UpdateUserMutationVariables>(UpdateUserDocument, variables, options) as Promise<Types.UpdateUserMutation>;
    },
    DeleteUser(variables: Types.DeleteUserMutationVariables, options?: C): Promise<Types.DeleteUserMutation> {
      return requester<Types.DeleteUserMutation, Types.DeleteUserMutationVariables>(DeleteUserDocument, variables, options) as Promise<Types.DeleteUserMutation>;
    },
    GetUsers(variables?: Types.GetUsersQueryVariables, options?: C): Promise<Types.GetUsersQuery> {
      return requester<Types.GetUsersQuery, Types.GetUsersQueryVariables>(GetUsersDocument, variables, options) as Promise<Types.GetUsersQuery>;
    },
    GetUser(variables: Types.GetUserQueryVariables, options?: C): Promise<Types.GetUserQuery> {
      return requester<Types.GetUserQuery, Types.GetUserQueryVariables>(GetUserDocument, variables, options) as Promise<Types.GetUserQuery>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;