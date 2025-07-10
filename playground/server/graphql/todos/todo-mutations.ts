import type { Todo } from '#build/graphql-types.generated'
import { defineResolver } from 'nitro-graphql'

export default defineResolver({
  Mutation: {
    addTodo: async (_parent, { title }, { storage }) => {
      const todos = await storage.getItem('todos') || []
      const todo: Todo = {
        id: Date.now().toString(),
        title,
        completed: false,
        createdAt: new Date(),
      }
      todos.push(todo)
      await storage.setItem('todos', todos)
      return todo
    },

    toggleTodo: async (_parent, { id }, { storage }) => {
      const todos = await storage.getItem('todos') || []
      const todo = todos.find((t: any) => t.id === id)
      if (!todo) {
        throw new Error('Todo not found')
      }
      todo.completed = !todo.completed
      await storage.setItem('todos', todos)
      return todo
    },

    deleteTodo: async (_parent, { id }, { storage }) => {
      const todos = await storage.getItem('todos') || []
      const index = todos.findIndex((t: any) => t.id === id)
      if (index === -1) {
        return false
      }
      todos.splice(index, 1)
      await storage.setItem('todos', todos)
      return true
    },
  },
})
