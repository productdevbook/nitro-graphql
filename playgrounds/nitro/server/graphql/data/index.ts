// Mock database - In-memory storage for playground
// import type { User } from '#graphql/server'

// Define types inline until GraphQL types are generated
interface User {
  id: string
  name: string
  email: string
  createdAt: Date
}

// Initial data
export const users: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', createdAt: new Date('2024-01-01') },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date('2024-01-02') },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', createdAt: new Date('2024-01-03') },
]

// Utility functions
export const generateId = () => Date.now().toString()

export function findById<T extends { id: string }>(items: T[], id: string) {
  return items.find(item => item.id === id)
}

export function removeById<T extends { id: string }>(items: T[], id: string) {
  return items.filter(item => item.id !== id)
}
