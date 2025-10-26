# E-Commerce GraphQL API

This example demonstrates a complete e-commerce GraphQL API with products, categories, shopping cart, orders, and checkout functionality. Perfect for building online stores with Nitro or Nuxt.

## Features Demonstrated

- Product catalog with categories and variants
- Shopping cart management
- Order processing and checkout
- Inventory management
- Price calculations with discounts
- Search and filtering
- Related products
- Customer accounts
- Type-safe resolvers and queries

## Domain Model

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Category   │──────│   Product   │──────│   Variant   │
└─────────────┘      └─────────────┘      └─────────────┘
                            │
                            │
                     ┌─────────────┐
                     │    Image    │
                     └─────────────┘

┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Customer   │──────│    Cart     │──────│  CartItem   │
└─────────────┘      └─────────────┘      └─────────────┘

┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Customer   │──────│    Order    │──────│  OrderItem  │
└─────────────┘      └─────────────┘      └─────────────┘
```

## Project Structure

```
ecommerce-api/
├── server/
│   ├── graphql/
│   │   ├── schema.graphql
│   │   ├── context.ts
│   │   ├── data/
│   │   │   └── index.ts            # Mock database
│   │   ├── products/
│   │   │   ├── product.graphql
│   │   │   ├── product-queries.resolver.ts
│   │   │   └── product-mutations.resolver.ts
│   │   ├── categories/
│   │   │   ├── category.graphql
│   │   │   └── category.resolver.ts
│   │   ├── cart/
│   │   │   ├── cart.graphql
│   │   │   └── cart.resolver.ts
│   │   ├── orders/
│   │   │   ├── order.graphql
│   │   │   └── order.resolver.ts
│   │   └── customers/
│   │       ├── customer.graphql
│   │       └── customer.resolver.ts
│   └── utils/
│       ├── pricing.ts
│       └── inventory.ts
├── nitro.config.ts
└── package.json
```

## GraphQL Schema

### server/graphql/schema.graphql

```graphql
scalar DateTime
scalar JSON

type Query {
  _empty: String
}

type Mutation {
  _empty: String
}
```

### server/graphql/products/product.graphql

```graphql
type Product {
  id: ID!
  name: String!
  slug: String!
  description: String!
  shortDescription: String
  sku: String!
  price: Money!
  compareAtPrice: Money
  category: Category!
  images: [ProductImage!]!
  variants: [ProductVariant!]!
  tags: [String!]!
  inStock: Boolean!
  stockQuantity: Int!
  rating: Float
  reviewCount: Int!
  relatedProducts: [Product!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type ProductVariant {
  id: ID!
  productId: ID!
  name: String!
  sku: String!
  price: Money!
  compareAtPrice: Money
  options: [VariantOption!]!
  inStock: Boolean!
  stockQuantity: Int!
  image: ProductImage
}

type VariantOption {
  name: String!
  value: String!
}

type ProductImage {
  id: ID!
  url: String!
  alt: String
  width: Int
  height: Int
  position: Int!
}

type Money {
  amount: Float!
  currency: String!
  formatted: String!
}

input ProductFilter {
  categoryId: ID
  minPrice: Float
  maxPrice: Float
  inStock: Boolean
  tags: [String!]
  search: String
}

input ProductSort {
  field: ProductSortField!
  direction: SortDirection!
}

enum ProductSortField {
  NAME
  PRICE
  CREATED_AT
  RATING
}

enum SortDirection {
  ASC
  DESC
}

extend type Query {
  products(
    filter: ProductFilter
    sort: ProductSort
    limit: Int = 20
    offset: Int = 0
  ): ProductConnection!
  product(id: ID, slug: String): Product
  searchProducts(query: String!, limit: Int = 20): [Product!]!
}

type ProductConnection {
  nodes: [Product!]!
  totalCount: Int!
  hasMore: Boolean!
}
```

### server/graphql/categories/category.graphql

```graphql
type Category {
  id: ID!
  name: String!
  slug: String!
  description: String
  parent: Category
  children: [Category!]!
  products(limit: Int = 20): [Product!]!
  productCount: Int!
  image: ProductImage
  position: Int!
}

extend type Query {
  categories: [Category!]!
  category(id: ID, slug: String): Category
}
```

### server/graphql/cart/cart.graphql

```graphql
type Cart {
  id: ID!
  customerId: ID
  items: [CartItem!]!
  subtotal: Money!
  tax: Money!
  shipping: Money!
  discount: Money!
  total: Money!
  itemCount: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type CartItem {
  id: ID!
  cartId: ID!
  product: Product!
  variant: ProductVariant
  quantity: Int!
  price: Money!
  subtotal: Money!
}

input AddToCartInput {
  productId: ID!
  variantId: ID
  quantity: Int!
}

input UpdateCartItemInput {
  itemId: ID!
  quantity: Int!
}

extend type Query {
  cart(id: ID!): Cart
  myCart: Cart
}

extend type Mutation {
  createCart: Cart!
  addToCart(cartId: ID!, input: AddToCartInput!): Cart!
  updateCartItem(cartId: ID!, input: UpdateCartItemInput!): Cart!
  removeFromCart(cartId: ID!, itemId: ID!): Cart!
  clearCart(cartId: ID!): Cart!
  applyCoupon(cartId: ID!, code: String!): Cart!
}
```

### server/graphql/orders/order.graphql

```graphql
type Order {
  id: ID!
  orderNumber: String!
  customerId: ID!
  customer: Customer!
  items: [OrderItem!]!
  status: OrderStatus!
  paymentStatus: PaymentStatus!
  subtotal: Money!
  tax: Money!
  shipping: Money!
  discount: Money!
  total: Money!
  shippingAddress: Address!
  billingAddress: Address!
  notes: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderItem {
  id: ID!
  orderId: ID!
  product: Product!
  variant: ProductVariant
  quantity: Int!
  price: Money!
  subtotal: Money!
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

type Address {
  firstName: String!
  lastName: String!
  company: String
  address1: String!
  address2: String
  city: String!
  state: String!
  postalCode: String!
  country: String!
  phone: String
}

input CheckoutInput {
  cartId: ID!
  shippingAddress: AddressInput!
  billingAddress: AddressInput!
  paymentMethod: String!
  notes: String
}

input AddressInput {
  firstName: String!
  lastName: String!
  company: String
  address1: String!
  address2: String
  city: String!
  state: String!
  postalCode: String!
  country: String!
  phone: String
}

extend type Query {
  order(id: ID, orderNumber: String): Order
  myOrders(limit: Int = 10, offset: Int = 0): [Order!]!
}

extend type Mutation {
  checkout(input: CheckoutInput!): Order!
  cancelOrder(orderId: ID!): Order!
}
```

### server/graphql/customers/customer.graphql

```graphql
type Customer {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!
  phone: String
  addresses: [Address!]!
  defaultShippingAddress: Address
  defaultBillingAddress: Address
  orders(limit: Int = 10): [Order!]!
  createdAt: DateTime!
}

input CreateCustomerInput {
  email: String!
  firstName: String!
  lastName: String!
  password: String!
  phone: String
}

input UpdateCustomerInput {
  firstName: String
  lastName: String
  phone: String
}

extend type Query {
  customer(id: ID!): Customer
  me: Customer
}

extend type Mutation {
  createCustomer(input: CreateCustomerInput!): Customer!
  updateCustomer(id: ID!, input: UpdateCustomerInput!): Customer!
  addAddress(customerId: ID!, address: AddressInput!): Customer!
}
```

## Resolvers

### server/graphql/data/index.ts

```typescript
import type { Cart, Category, Customer, Order, Product } from '#graphql/server'

// Mock data store
export const categories: Category[] = [
  {
    id: '1',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and accessories',
    parent: null,
    children: [],
    productCount: 15,
    position: 1,
  },
  {
    id: '2',
    name: 'Clothing',
    slug: 'clothing',
    description: 'Fashion and apparel',
    parent: null,
    children: [],
    productCount: 25,
    position: 2,
  },
  {
    id: '3',
    name: 'Home & Garden',
    slug: 'home-garden',
    description: 'Home decor and garden supplies',
    parent: null,
    children: [],
    productCount: 20,
    position: 3,
  },
]

export const products: Product[] = [
  {
    id: '1',
    name: 'Wireless Bluetooth Headphones',
    slug: 'wireless-bluetooth-headphones',
    description: 'Premium wireless headphones with active noise cancellation',
    shortDescription: 'Premium wireless headphones',
    sku: 'WBH-001',
    price: { amount: 199.99, currency: 'USD', formatted: '$199.99' },
    compareAtPrice: { amount: 249.99, currency: 'USD', formatted: '$249.99' },
    category: categories[0],
    images: [
      {
        id: '1',
        url: 'https://example.com/images/headphones-1.jpg',
        alt: 'Wireless Headphones',
        width: 800,
        height: 800,
        position: 1,
      },
    ],
    variants: [],
    tags: ['electronics', 'audio', 'wireless'],
    inStock: true,
    stockQuantity: 50,
    rating: 4.5,
    reviewCount: 128,
    relatedProducts: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Organic Cotton T-Shirt',
    slug: 'organic-cotton-t-shirt',
    description: 'Comfortable organic cotton t-shirt in multiple colors',
    shortDescription: 'Organic cotton t-shirt',
    sku: 'OCT-001',
    price: { amount: 29.99, currency: 'USD', formatted: '$29.99' },
    compareAtPrice: null,
    category: categories[1],
    images: [
      {
        id: '2',
        url: 'https://example.com/images/tshirt-1.jpg',
        alt: 'Organic T-Shirt',
        width: 800,
        height: 800,
        position: 1,
      },
    ],
    variants: [
      {
        id: 'v1',
        productId: '2',
        name: 'Small / Black',
        sku: 'OCT-001-S-BLK',
        price: { amount: 29.99, currency: 'USD', formatted: '$29.99' },
        compareAtPrice: null,
        options: [
          { name: 'Size', value: 'Small' },
          { name: 'Color', value: 'Black' },
        ],
        inStock: true,
        stockQuantity: 20,
        image: null,
      },
    ],
    tags: ['clothing', 'organic', 'casual'],
    inStock: true,
    stockQuantity: 100,
    rating: 4.8,
    reviewCount: 256,
    relatedProducts: [],
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-10'),
  },
]

export const carts: Cart[] = []
export const orders: Order[] = []
export const customers: Customer[] = []

// Utility functions
export const generateId = () => Date.now().toString()

export function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id)
}

export function formatMoney(amount: number, currency = 'USD') {
  return {
    amount,
    currency,
    formatted: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount),
  }
}

export function calculateCartTotal(cart: Cart) {
  const subtotal = cart.items.reduce((sum, item) => sum + item.subtotal.amount, 0)
  const tax = subtotal * 0.08 // 8% tax
  const shipping = subtotal > 50 ? 0 : 10 // Free shipping over $50
  const discount = cart.discount?.amount || 0
  const total = subtotal + tax + shipping - discount

  return {
    subtotal: formatMoney(subtotal),
    tax: formatMoney(tax),
    shipping: formatMoney(shipping),
    discount: formatMoney(discount),
    total: formatMoney(total),
  }
}
```

### server/graphql/products/product-queries.resolver.ts

```typescript
import { categories, products } from '../data'

export const productQueries = defineQuery({
  products: (_, { filter, sort, limit = 20, offset = 0 }) => {
    let filtered = [...products]

    // Apply filters
    if (filter) {
      if (filter.categoryId) {
        filtered = filtered.filter(p => p.category.id === filter.categoryId)
      }
      if (filter.minPrice) {
        filtered = filtered.filter(p => p.price.amount >= filter.minPrice)
      }
      if (filter.maxPrice) {
        filtered = filtered.filter(p => p.price.amount <= filter.maxPrice)
      }
      if (filter.inStock !== undefined) {
        filtered = filtered.filter(p => p.inStock === filter.inStock)
      }
      if (filter.tags && filter.tags.length > 0) {
        filtered = filtered.filter(p =>
          filter.tags.some(tag => p.tags.includes(tag))
        )
      }
      if (filter.search) {
        const search = filter.search.toLowerCase()
        filtered = filtered.filter(
          p =>
            p.name.toLowerCase().includes(search)
            || p.description.toLowerCase().includes(search)
        )
      }
    }

    // Apply sorting
    if (sort) {
      filtered.sort((a, b) => {
        let comparison = 0
        switch (sort.field) {
          case 'NAME':
            comparison = a.name.localeCompare(b.name)
            break
          case 'PRICE':
            comparison = a.price.amount - b.price.amount
            break
          case 'CREATED_AT':
            comparison = a.createdAt.getTime() - b.createdAt.getTime()
            break
          case 'RATING':
            comparison = (a.rating || 0) - (b.rating || 0)
            break
        }
        return sort.direction === 'DESC' ? -comparison : comparison
      })
    }

    const totalCount = filtered.length
    const nodes = filtered.slice(offset, offset + limit)
    const hasMore = offset + limit < totalCount

    return {
      nodes,
      totalCount,
      hasMore,
    }
  },

  product: (_, { id, slug }) => {
    if (id) {
      return products.find(p => p.id === id) || null
    }
    if (slug) {
      return products.find(p => p.slug === slug) || null
    }
    return null
  },

  searchProducts: (_, { query, limit = 20 }) => {
    const search = query.toLowerCase()
    return products
      .filter(
        p =>
          p.name.toLowerCase().includes(search)
          || p.description.toLowerCase().includes(search)
          || p.tags.some(tag => tag.toLowerCase().includes(search))
      )
      .slice(0, limit)
  },
})

export const productTypeResolver = defineType({
  Product: {
    relatedProducts: (product) => {
      // Return products from the same category
      return products
        .filter(
          p => p.category.id === product.category.id && p.id !== product.id
        )
        .slice(0, 4)
    },
  },
})
```

### server/graphql/cart/cart.resolver.ts

```typescript
import { calculateCartTotal, carts, findById, formatMoney, generateId, products } from '../data'

export const cartQueries = defineQuery({
  cart: (_, { id }) => {
    return findById(carts, id) || null
  },

  myCart: (_, __, context) => {
    // Get cart for current customer/session
    const customerId = context.user?.id
    if (!customerId)
      return null

    return carts.find(c => c.customerId === customerId) || null
  },
})

export const cartMutations = defineMutation({
  createCart: () => {
    const newCart = {
      id: generateId(),
      customerId: null,
      items: [],
      subtotal: formatMoney(0),
      tax: formatMoney(0),
      shipping: formatMoney(0),
      discount: formatMoney(0),
      total: formatMoney(0),
      itemCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    carts.push(newCart)
    return newCart
  },

  addToCart: (_, { cartId, input }) => {
    const cart = findById(carts, cartId)
    if (!cart) {
      throw new Error(`Cart with id ${cartId} not found`)
    }

    const product = findById(products, input.productId)
    if (!product) {
      throw new Error(`Product with id ${input.productId} not found`)
    }

    // Check if item already exists
    const existingItem = cart.items.find(
      item =>
        item.product.id === input.productId
        && item.variant?.id === input.variantId
    )

    if (existingItem) {
      // Update quantity
      existingItem.quantity += input.quantity
      existingItem.subtotal = formatMoney(
        existingItem.price.amount * existingItem.quantity
      )
    }
    else {
      // Add new item
      const variant = input.variantId
        ? product.variants.find(v => v.id === input.variantId)
        : null

      const price = variant?.price || product.price
      const newItem = {
        id: generateId(),
        cartId,
        product,
        variant,
        quantity: input.quantity,
        price,
        subtotal: formatMoney(price.amount * input.quantity),
      }

      cart.items.push(newItem)
    }

    // Recalculate totals
    Object.assign(cart, calculateCartTotal(cart))
    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
    cart.updatedAt = new Date()

    return cart
  },

  updateCartItem: (_, { cartId, input }) => {
    const cart = findById(carts, cartId)
    if (!cart) {
      throw new Error(`Cart with id ${cartId} not found`)
    }

    const item = cart.items.find(i => i.id === input.itemId)
    if (!item) {
      throw new Error(`Cart item with id ${input.itemId} not found`)
    }

    item.quantity = input.quantity
    item.subtotal = formatMoney(item.price.amount * item.quantity)

    // Recalculate totals
    Object.assign(cart, calculateCartTotal(cart))
    cart.itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0)
    cart.updatedAt = new Date()

    return cart
  },

  removeFromCart: (_, { cartId, itemId }) => {
    const cart = findById(carts, cartId)
    if (!cart) {
      throw new Error(`Cart with id ${cartId} not found`)
    }

    cart.items = cart.items.filter(item => item.id !== itemId)

    // Recalculate totals
    Object.assign(cart, calculateCartTotal(cart))
    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
    cart.updatedAt = new Date()

    return cart
  },

  clearCart: (_, { cartId }) => {
    const cart = findById(carts, cartId)
    if (!cart) {
      throw new Error(`Cart with id ${cartId} not found`)
    }

    cart.items = []
    cart.subtotal = formatMoney(0)
    cart.tax = formatMoney(0)
    cart.shipping = formatMoney(0)
    cart.discount = formatMoney(0)
    cart.total = formatMoney(0)
    cart.itemCount = 0
    cart.updatedAt = new Date()

    return cart
  },

  applyCoupon: (_, { cartId, code }) => {
    const cart = findById(carts, cartId)
    if (!cart) {
      throw new Error(`Cart with id ${cartId} not found`)
    }

    // Mock coupon logic - 10% off for code "SAVE10"
    if (code === 'SAVE10') {
      const subtotal = cart.items.reduce(
        (sum, item) => sum + item.subtotal.amount,
        0
      )
      cart.discount = formatMoney(subtotal * 0.1)
    }
    else {
      throw new Error('Invalid coupon code')
    }

    // Recalculate totals
    Object.assign(cart, calculateCartTotal(cart))
    cart.updatedAt = new Date()

    return cart
  },
})
```

### server/graphql/orders/order.resolver.ts

```typescript
import { carts, customers, findById, formatMoney, generateId, orders } from '../data'

export const orderQueries = defineQuery({
  order: (_, { id, orderNumber }) => {
    if (id) {
      return findById(orders, id) || null
    }
    if (orderNumber) {
      return orders.find(o => o.orderNumber === orderNumber) || null
    }
    return null
  },

  myOrders: (_, { limit = 10, offset = 0 }, context) => {
    const customerId = context.user?.id
    if (!customerId)
      return []

    return orders
      .filter(o => o.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit)
  },
})

export const orderMutations = defineMutation({
  checkout: (_, { input }) => {
    const cart = findById(carts, input.cartId)
    if (!cart) {
      throw new Error(`Cart with id ${input.cartId} not found`)
    }

    if (cart.items.length === 0) {
      throw new Error('Cannot checkout an empty cart')
    }

    // Create order from cart
    const orderNumber = `ORD-${Date.now()}`
    const newOrder = {
      id: generateId(),
      orderNumber,
      customerId: cart.customerId || 'guest',
      customer: null, // Will be resolved by type resolver
      items: cart.items.map(item => ({
        id: generateId(),
        orderId: '',
        product: item.product,
        variant: item.variant,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      })),
      status: 'PENDING',
      paymentStatus: 'PENDING',
      subtotal: cart.subtotal,
      tax: cart.tax,
      shipping: cart.shipping,
      discount: cart.discount,
      total: cart.total,
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress,
      notes: input.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    orders.push(newOrder)

    // Clear the cart
    cart.items = []
    cart.itemCount = 0
    cart.subtotal = formatMoney(0)
    cart.total = formatMoney(0)

    return newOrder
  },

  cancelOrder: (_, { orderId }) => {
    const order = findById(orders, orderId)
    if (!order) {
      throw new Error(`Order with id ${orderId} not found`)
    }

    if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      throw new Error('Cannot cancel a shipped or delivered order')
    }

    order.status = 'CANCELLED'
    order.updatedAt = new Date()

    return order
  },
})

export const orderTypeResolver = defineType({
  Order: {
    customer: (order) => {
      return findById(customers, order.customerId) || null
    },
  },
})
```

## Running the E-Commerce API

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build for production
pnpm build

# Preview production
pnpm preview
```

Access the GraphQL endpoint at: `http://localhost:3000/api/graphql`

## Example Queries and Mutations

### Browse Products

```graphql
query BrowseProducts {
  products(
    filter: {
      categoryId: "1"
      minPrice: 0
      maxPrice: 500
      inStock: true
    }
    sort: { field: PRICE, direction: ASC }
    limit: 20
  ) {
    nodes {
      id
      name
      slug
      price {
        amount
        formatted
      }
      compareAtPrice {
        formatted
      }
      images {
        url
        alt
      }
      inStock
      rating
      reviewCount
    }
    totalCount
    hasMore
  }
}
```

### Get Product Details

```graphql
query GetProduct($slug: String!) {
  product(slug: $slug) {
    id
    name
    description
    price {
      formatted
    }
    compareAtPrice {
      formatted
    }
    images {
      url
      alt
    }
    variants {
      id
      name
      price {
        formatted
      }
      inStock
      options {
        name
        value
      }
    }
    category {
      name
      slug
    }
    relatedProducts {
      id
      name
      slug
      price {
        formatted
      }
      images {
        url
      }
    }
  }
}
```

### Shopping Cart

```graphql
# Create cart
mutation CreateCart {
  createCart {
    id
  }
}

# Add to cart
mutation AddToCart($cartId: ID!, $productId: ID!, $quantity: Int!) {
  addToCart(
    cartId: $cartId
    input: { productId: $productId, quantity: $quantity }
  ) {
    id
    items {
      id
      product {
        name
      }
      quantity
      subtotal {
        formatted
      }
    }
    total {
      formatted
    }
    itemCount
  }
}

# Get cart
query GetCart($cartId: ID!) {
  cart(id: $cartId) {
    id
    items {
      id
      product {
        name
        images {
          url
        }
      }
      variant {
        name
      }
      quantity
      price {
        formatted
      }
      subtotal {
        formatted
      }
    }
    subtotal {
      formatted
    }
    tax {
      formatted
    }
    shipping {
      formatted
    }
    discount {
      formatted
    }
    total {
      formatted
    }
  }
}

# Apply coupon
mutation ApplyCoupon($cartId: ID!) {
  applyCoupon(cartId: $cartId, code: "SAVE10") {
    discount {
      formatted
    }
    total {
      formatted
    }
  }
}
```

### Checkout

```graphql
mutation Checkout($input: CheckoutInput!) {
  checkout(input: $input) {
    id
    orderNumber
    status
    total {
      formatted
    }
    items {
      product {
        name
      }
      quantity
      subtotal {
        formatted
      }
    }
    shippingAddress {
      address1
      city
      state
      postalCode
    }
  }
}

# Variables
{
  "input": {
    "cartId": "123",
    "shippingAddress": {
      "firstName": "John",
      "lastName": "Doe",
      "address1": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "postalCode": "12345",
      "country": "US"
    },
    "billingAddress": {
      "firstName": "John",
      "lastName": "Doe",
      "address1": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "postalCode": "12345",
      "country": "US"
    },
    "paymentMethod": "credit_card"
  }
}
```

### Order Management

```graphql
# Get orders
query MyOrders {
  myOrders(limit: 10) {
    id
    orderNumber
    status
    paymentStatus
    total {
      formatted
    }
    items {
      product {
        name
      }
      quantity
    }
    createdAt
  }
}

# Cancel order
mutation CancelOrder($orderId: ID!) {
  cancelOrder(orderId: $orderId) {
    id
    status
  }
}
```

## Next Steps

1. **Real Database**: Replace mock data with Drizzle, Prisma, or your ORM
2. **Payment Integration**: Add Stripe, PayPal, or other payment processors
3. **Authentication**: Implement customer authentication
4. **Inventory Management**: Real-time stock updates
5. **Reviews & Ratings**: Add product reviews
6. **Search**: Implement full-text search with Algolia or Meilisearch
7. **Recommendations**: Add product recommendation engine
8. **Email Notifications**: Send order confirmations
9. **Admin Panel**: Build admin GraphQL mutations
10. **Analytics**: Track conversions and cart abandonment

## Related Examples

- [Basic Nitro Server](./nitro-basic.md) - Getting started
- [Full-stack Nuxt App](./nuxt-fullstack.md) - Client-side integration
- [External Services](./external-services.md) - Integrate payment providers

## Production Considerations

- Use a real database with transactions
- Implement proper authentication and authorization
- Add rate limiting for API endpoints
- Set up payment webhooks
- Implement inventory locking during checkout
- Add comprehensive error handling
- Set up monitoring and logging
- Implement caching for product catalogs
- Add CDN for product images
- Set up backup and disaster recovery
