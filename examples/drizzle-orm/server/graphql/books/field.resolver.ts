import { defineField } from 'nitro-graphql/define'

export const field = defineField({
  Book: {
    isAvailable: (parent, args, { context }) => {
      // A book is considered available if it was published within the last 5 years
      const currentYear = new Date().getFullYear()
      return parent.publishedYear !== null && currentYear - Number.parseInt(parent.publishedYear) <= 5
    },
  },
})
