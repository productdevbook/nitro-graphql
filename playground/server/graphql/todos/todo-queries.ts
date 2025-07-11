
export default defineResolver({
  Query: {
    todos: async (_parent, _args, { storage }) => {
      const todos = await storage.getItem('todos') || []
      return [{
        id: '1',
        title: 'Sample Todo',
        completed: false,
        createdAt: new Date().toISOString(),
      }]
    },

    todo: async (_parent, { id }, { storage }) => {
      const todos = await storage.getItem('todos') || []
      return todos.find((todo: any) => todo.id === id) || null
    },
  },
})
