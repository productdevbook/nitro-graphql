import { drizzle } from 'drizzle-orm/node-postgres'
import { tables } from '../drizzle'

export type Database = ReturnType<typeof useDatabaseConnect>

let _database: ReturnType<typeof useDatabaseConnect>

function useDatabaseConnect() {
  return drizzle(process.env.NITRO_BOOK_DATABASE_URL as string, {
    casing: 'camelCase',
    schema: tables,
  })
}

export function useDatabase() {
  if (!_database) {
    _database = useDatabaseConnect()
  }
  return _database
}
