import type { CreateUserInput, GetUsersQuery, UpdateUserInput } from '#graphql/client'

export function useUsers() {
  const api = useGraphQL()

  // State
  const users = ref<GetUsersQuery['users']>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const userCount = computed(() => users.value.length)
  const hasUsers = computed(() => users.value.length > 0)

  // Actions
  const fetchUsers = async () => {
    isLoading.value = true
    error.value = null

    try {
      const { users: fetchedUsers } = await api.GetUsers()
      users.value = fetchedUsers
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch users'
      console.error('Error fetching users:', err)
    }
    finally {
      isLoading.value = false
    }
  }

  const createUser = async (input: CreateUserInput) => {
    try {
      const { createUser: newUser } = await api.CreateUser({ input })
      users.value.unshift(newUser)
      return newUser
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create user'
      throw err
    }
  }

  const updateUser = async (id: string, input: UpdateUserInput) => {
    try {
      const { updateUser: updatedUser } = await api.UpdateUser({ id, input })
      const index = users.value.findIndex(u => u.id === id)
      if (index !== -1) {
        users.value[index] = updatedUser
      }
      return updatedUser
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update user'
      throw err
    }
  }

  const deleteUser = async (id: string) => {
    try {
      await api.DeleteUser({ id })
      users.value = users.value.filter(u => u.id !== id)
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete user'
      throw err
    }
  }

  // Auto-fetch on mount
  onMounted(() => {
    fetchUsers()
  })

  return {
    // State
    users: readonly(users),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Computed
    userCount,
    hasUsers,

    // Actions
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,

    // Utilities
    refresh: fetchUsers,
  }
}
