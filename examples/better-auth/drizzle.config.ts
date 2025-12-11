import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/drizzle/schema/index.ts',
  out: './server/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.NITRO_BOOK_DATABASE_URL || 'postgresql://postgres:postgres_dev_password@localhost:5432/books',
  },
  casing: 'camelCase',
})
