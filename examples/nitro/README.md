# Nitro GraphQL Starter

Minimal Nitro + GraphQL example.

## Get Started

Clone this example using [giget](https://github.com/unjs/giget):

```bash
npx giget@latest gh:productdevbook/nitro-graphql/examples/nitro my-nitro-app
cd my-nitro-app
pnpm install
```

Or using pnpm:

```bash
pnpm dlx giget@latest gh:productdevbook/nitro-graphql/examples/nitro my-nitro-app
```

## Development

```bash
pnpm install
pnpm dev
```

GraphQL Playground: http://localhost:3000/api/graphql

## Example Queries

```graphql
query {
  hello
  greeting(name: "World")
}
```
