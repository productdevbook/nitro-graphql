// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import * as Types from '#graphql-client';

export type GetUsersQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type GetUsersQuery = { __typename?: 'Query', users: Array<{ __typename?: 'User', id: string, name: string, email: string, createdAt: any }> };

export type GetUserQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input'];
}>;


export type GetUserQuery = { __typename?: 'Query', user?: { __typename?: 'User', id: string, name: string, email: string, createdAt: any } | null };

export type GetTodosQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type GetTodosQuery = { __typename?: 'Query', todos: Array<{ __typename?: 'Todo', id: string, title: string, completed: boolean, createdAt: any }> };

export type GetPostsQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type GetPostsQuery = { __typename?: 'Query', posts: Array<{ __typename?: 'Post', id: string, title: string, content: string, authorId: string }> };

export type GetPostWithCommentsQueryVariables = Types.Exact<{
  postId: Types.Scalars['ID']['input'];
}>;


export type GetPostWithCommentsQuery = { __typename?: 'Query', post?: { __typename?: 'Post', id: string, title: string, content: string, authorId: string } | null, comments: Array<{ __typename?: 'Comment', id: string, content: string, authorId: string }> };


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
export const GetTodosDocument = /*#__PURE__*/ `
    query GetTodos {
  todos {
    id
    title
    completed
    createdAt
  }
}
    `;
export const GetPostsDocument = /*#__PURE__*/ `
    query GetPosts {
  posts {
    id
    title
    content
    authorId
  }
}
    `;
export const GetPostWithCommentsDocument = /*#__PURE__*/ `
    query GetPostWithComments($postId: ID!) {
  post(id: $postId) {
    id
    title
    content
    authorId
  }
  comments(postId: $postId) {
    id
    content
    authorId
  }
}
    `;
export type Requester<C = {}> = <R, V>(doc: string, vars?: V, options?: C) => Promise<R> | AsyncIterable<R>
export function getSdk<C>(requester: Requester<C>) {
  return {
    GetUsers(variables?: Types.GetUsersQueryVariables, options?: C): Promise<Types.GetUsersQuery> {
      return requester<Types.GetUsersQuery, Types.GetUsersQueryVariables>(GetUsersDocument, variables, options) as Promise<Types.GetUsersQuery>;
    },
    GetUser(variables: Types.GetUserQueryVariables, options?: C): Promise<Types.GetUserQuery> {
      return requester<Types.GetUserQuery, Types.GetUserQueryVariables>(GetUserDocument, variables, options) as Promise<Types.GetUserQuery>;
    },
    GetTodos(variables?: Types.GetTodosQueryVariables, options?: C): Promise<Types.GetTodosQuery> {
      return requester<Types.GetTodosQuery, Types.GetTodosQueryVariables>(GetTodosDocument, variables, options) as Promise<Types.GetTodosQuery>;
    },
    GetPosts(variables?: Types.GetPostsQueryVariables, options?: C): Promise<Types.GetPostsQuery> {
      return requester<Types.GetPostsQuery, Types.GetPostsQueryVariables>(GetPostsDocument, variables, options) as Promise<Types.GetPostsQuery>;
    },
    GetPostWithComments(variables: Types.GetPostWithCommentsQueryVariables, options?: C): Promise<Types.GetPostWithCommentsQuery> {
      return requester<Types.GetPostWithCommentsQuery, Types.GetPostWithCommentsQueryVariables>(GetPostWithCommentsDocument, variables, options) as Promise<Types.GetPostWithCommentsQuery>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;