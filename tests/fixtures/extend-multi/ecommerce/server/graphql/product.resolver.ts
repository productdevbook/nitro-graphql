import { defineQuery } from 'nitro-graphql/define'

export const ecommerceQueries = defineQuery({
  products: () => [
    { id: 'prod-1', name: 'Widget', price: 9.99 },
  ],
})
