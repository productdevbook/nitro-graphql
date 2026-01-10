import { mergeTypeDefs } from '@graphql-tools/merge'
import { buildSchema, parse } from 'graphql'
import { bench, describe } from 'vitest'

const simpleSchema = `
  type Query {
    hello: String
  }
`

const complexSchema = `
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    comments: [Comment!]!
  }

  type Comment {
    id: ID!
    text: String!
    author: User!
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
    post(id: ID!): Post
    posts: [Post!]!
  }

  type Mutation {
    createUser(name: String!, email: String!): User!
    createPost(title: String!, content: String!, authorId: ID!): Post!
    createComment(text: String!, postId: ID!, authorId: ID!): Comment!
  }
`

describe('graphQL Schema Operations', () => {
  bench('parse simple schema', () => {
    parse(simpleSchema)
  })

  bench('parse complex schema', () => {
    parse(complexSchema)
  })

  bench('build simple schema', () => {
    buildSchema(simpleSchema)
  })

  bench('build complex schema', () => {
    buildSchema(complexSchema)
  })

  bench('merge multiple schemas', () => {
    mergeTypeDefs([simpleSchema, complexSchema], {
      throwOnConflict: false,
      commentDescriptions: true,
      sort: true,
    })
  })
})
