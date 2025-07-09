import type { QueryResolvers } from '../../types.generated'

export default {
  Query: {
    todos: async (_parent, _args, { storage }) => {
      const todos = await storage.getItem('todos') || []
      return todos
    },

    todo: async (_parent, { id }, { storage }) => {
      const todos = await storage.getItem('todos') || []
      return todos.find((todo: any) => todo.id === id) || null
    },
  } as QueryResolvers,
}
