import { makeExecutableSchema } from '@graphql-tools/schema'

const typeDefs = `
  type Query {
    hello(name: String): String
    todos: [Todo!]!
    todo(id: ID!): Todo
  }
  
  type Todo {
    id: ID!
    title: String!
    completed: Boolean!
    createdAt: String!
  }
  
  type Mutation {
    addTodo(title: String!): Todo!
    toggleTodo(id: ID!): Todo!
    deleteTodo(id: ID!): Boolean!
  }
`

const resolvers = {
  Query: {
    hello: (_parent, args) => `Hello ${args.name || 'World'}!`,

    todos: async (_, __, { storage }) => {
      const todos = await storage.getItem('todos') || []
      return todos
    },

    todo: async (_, { id }, { storage }) => {
      const todos = await storage.getItem('todos') || []
      return todos.find(todo => todo.id === id)
    },
  },

  Mutation: {
    addTodo: async (_, { title }, { storage }) => {
      const todos = await storage.getItem('todos') || []
      const todo = {
        id: Date.now().toString(),
        title,
        completed: false,
        createdAt: new Date().toISOString(),
      }
      todos.push(todo)
      await storage.setItem('todos', todos)
      return todo
    },

    toggleTodo: async (_, { id }, { storage }) => {
      const todos = await storage.getItem('todos') || []
      const todo = todos.find(t => t.id === id)
      if (!todo) {
        throw new Error('Todo not found')
      }
      todo.completed = !todo.completed
      await storage.setItem('todos', todos)
      return todo
    },

    deleteTodo: async (_, { id }, { storage }) => {
      const todos = await storage.getItem('todos') || []
      const index = todos.findIndex(t => t.id === id)
      if (index === -1) {
        return false
      }
      todos.splice(index, 1)
      await storage.setItem('todos', todos)
      return true
    },
  },
}

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})
