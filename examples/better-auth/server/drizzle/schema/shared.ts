import { timestamp, uuid } from 'drizzle-orm/pg-core'

export const customTimestamp = () => timestamp({ mode: 'string', precision: 3, withTimezone: true })

// Her tabloya soft delete ekle
export function softDeleteFields() {
  return {
    deletedAt: customTimestamp(),
    deletedBy: uuid(),
  }
}
