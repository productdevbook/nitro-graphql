export default defineResolver({
  Query: {
    todos: async (_parent, _args, context) => {
      // const todos = await storage.getItem('todos') || []
      return [{
        id: '1',
      }]
    },

    todo: async (_parent, { id }, context) => {
      const todos = []
      return todos.find((todo: any) => todo.id === id) || null
    },
  },
})
