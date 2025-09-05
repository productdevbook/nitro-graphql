# Nuxt + nitro-graphql Example

This is a Nuxt.js application demonstrating the integration of the `nitro-graphql` module.

## Features

- ✅ GraphQL server with automatic type generation
- ✅ Apollo Sandbox integration
- ✅ Hot reload in development
- ✅ Domain-based resolver organization
- ✅ Health check endpoint

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm dev
```

3. Open your browser and visit:
   - **Application**: http://localhost:3000
   - **GraphQL Playground**: http://localhost:3000/api/graphql
   - **Health Check**: http://localhost:3000/api/graphql/health

## GraphQL Schema

The GraphQL schema includes:
- **Queries**: `hello`, `greeting`, `users`, `user`
- **Mutations**: `createUser`
- **Types**: `User`, `CreateUserInput`

## File Structure

```
server/
├── graphql/
│   ├── schema.graphql     # Main GraphQL schema
│   ├── hello.ts          # Hello and greeting resolvers
│   └── users.ts          # User query and mutation resolvers
```

## Testing

You can test the GraphQL API using:
1. The built-in test interface on the homepage
2. The Apollo Sandbox at `/api/graphql`
3. Any GraphQL client like Postman or Insomnia

## Example Queries

### Hello Query
```graphql
query {
  hello
}
```

### Greeting Query
```graphql
query {
  greeting(name: "World")
}
```

### Users Query
```graphql
query {
  users {
    id
    name
    email
    createdAt
  }
}
```

### Create User Mutation
```graphql
mutation {
  createUser(input: { name: "John Doe", email: "john@example.com" }) {
    id
    name
    email
    createdAt
  }
}
```
