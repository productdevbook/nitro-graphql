// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import * as Types from '#graphql-client';

export type CreateUserMutationVariables = Types.Exact<{
  input: Types.CreateUserInput;
}>;


export type CreateUserMutation = { __typename?: 'Mutation', createUser: { __typename?: 'User', id: string, name: string, email: string, createdAt: Date } };

export type AddTodoMutationVariables = Types.Exact<{
  title: Types.Scalars['String']['input'];
}>;


export type AddTodoMutation = { __typename?: 'Mutation', addTodo: { __typename?: 'Todo', id: string, title: string, completed: boolean, createdAt: Date } };

export type ToggleTodoMutationVariables = Types.Exact<{
  id: Types.Scalars['ID']['input'];
}>;


export type ToggleTodoMutation = { __typename?: 'Mutation', toggleTodo: { __typename?: 'Todo', id: string, title: string, completed: boolean, createdAt: Date } };

export type DeleteTodoMutationVariables = Types.Exact<{
  id: Types.Scalars['ID']['input'];
}>;


export type DeleteTodoMutation = { __typename?: 'Mutation', deleteTodo: boolean };

export type CreatePostMutationVariables = Types.Exact<{
  input: Types.CreatePostInput;
}>;


export type CreatePostMutation = { __typename?: 'Mutation', createPost: { __typename?: 'Post', id: string, title: string, content: string, authorId: string } };

export type AddCommentMutationVariables = Types.Exact<{
  input: Types.AddCommentInput;
}>;


export type AddCommentMutation = { __typename?: 'Mutation', addComment: { __typename?: 'Comment', id: string, content: string, postId: string, authorId: string } };

export type GetUsersQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type GetUsersQuery = { __typename?: 'Query', users: Array<{ __typename?: 'User', id: string, name: string, email: string, createdAt: Date }> };

export type GetUserQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input'];
}>;


export type GetUserQuery = { __typename?: 'Query', user?: { __typename?: 'User', id: string, name: string, email: string, createdAt: Date } | null };

export type GetTodosQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type GetTodosQuery = { __typename?: 'Query', todos: Array<{ __typename?: 'Todo', id: string, title: string, completed: boolean, createdAt: Date }> };

export type GetPostsQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type GetPostsQuery = { __typename?: 'Query', posts: Array<{ __typename?: 'Post', id: string, title: string, content: string, authorId: string }> };

export type GetPostWithCommentsQueryVariables = Types.Exact<{
  postId: Types.Scalars['ID']['input'];
}>;


export type GetPostWithCommentsQuery = { __typename?: 'Query', post?: { __typename?: 'Post', id: string, title: string, content: string, authorId: string } | null, comments: Array<{ __typename?: 'Comment', id: string, content: string, authorId: string }> };


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
export const AddTodoDocument = /*#__PURE__*/ `
    mutation AddTodo($title: String!) {
  addTodo(title: $title) {
    id
    title
    completed
    createdAt
  }
}
    `;
export const ToggleTodoDocument = /*#__PURE__*/ `
    mutation ToggleTodo($id: ID!) {
  toggleTodo(id: $id) {
    id
    title
    completed
    createdAt
  }
}
    `;
export const DeleteTodoDocument = /*#__PURE__*/ `
    mutation DeleteTodo($id: ID!) {
  deleteTodo(id: $id)
}
    `;
export const CreatePostDocument = /*#__PURE__*/ `
    mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    id
    title
    content
    authorId
  }
}
    `;
export const AddCommentDocument = /*#__PURE__*/ `
    mutation AddComment($input: AddCommentInput!) {
  addComment(input: $input) {
    id
    content
    postId
    authorId
  }
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
    CreateUser(variables: Types.CreateUserMutationVariables, options?: C): Promise<Types.CreateUserMutation> {
      return requester<Types.CreateUserMutation, Types.CreateUserMutationVariables>(CreateUserDocument, variables, options) as Promise<Types.CreateUserMutation>;
    },
    AddTodo(variables: Types.AddTodoMutationVariables, options?: C): Promise<Types.AddTodoMutation> {
      return requester<Types.AddTodoMutation, Types.AddTodoMutationVariables>(AddTodoDocument, variables, options) as Promise<Types.AddTodoMutation>;
    },
    ToggleTodo(variables: Types.ToggleTodoMutationVariables, options?: C): Promise<Types.ToggleTodoMutation> {
      return requester<Types.ToggleTodoMutation, Types.ToggleTodoMutationVariables>(ToggleTodoDocument, variables, options) as Promise<Types.ToggleTodoMutation>;
    },
    DeleteTodo(variables: Types.DeleteTodoMutationVariables, options?: C): Promise<Types.DeleteTodoMutation> {
      return requester<Types.DeleteTodoMutation, Types.DeleteTodoMutationVariables>(DeleteTodoDocument, variables, options) as Promise<Types.DeleteTodoMutation>;
    },
    CreatePost(variables: Types.CreatePostMutationVariables, options?: C): Promise<Types.CreatePostMutation> {
      return requester<Types.CreatePostMutation, Types.CreatePostMutationVariables>(CreatePostDocument, variables, options) as Promise<Types.CreatePostMutation>;
    },
    AddComment(variables: Types.AddCommentMutationVariables, options?: C): Promise<Types.AddCommentMutation> {
      return requester<Types.AddCommentMutation, Types.AddCommentMutationVariables>(AddCommentDocument, variables, options) as Promise<Types.AddCommentMutation>;
    },
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