export default createResolver({
  Query: {
    todos: async (_parent, _args, { storage }) => {
      const todos = await storage.getItem('todos') || []
      return todos
    },

    todo: async (_parent, { id }, { storage }) => {
      const todos = await storage.getItem('todos') || []
      return todos.find((todo: any) => todo.id === id) || null
    },
  },
})
