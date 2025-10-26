# File Organization

Best practices for organizing your GraphQL code in Nitro GraphQL applications.

## Recommended Structure

### Small Project

```
server/
└── graphql/
    ├── schema.graphql
    ├── hello.resolver.ts
    └── context.ts
```

### Medium Project

```
server/
└── graphql/
    ├── schema.graphql
    ├── users/
    │   ├── user.graphql
    │   ├── queries.resolver.ts
    │   └── mutations.resolver.ts
    ├── posts/
    │   ├── post.graphql
    │   └── post.resolver.ts
    └── directives/
        └── auth.directive.ts
```

### Large Project

```
server/
└── graphql/
    ├── schema.graphql
    ├── auth/
    │   ├── user.graphql
    │   ├── user-queries.resolver.ts
    │   ├── user-mutations.resolver.ts
    │   └── user-types.resolver.ts
    ├── content/
    │   ├── post.graphql
    │   ├── comment.graphql
    │   └── media.graphql
    ├── directives/
    │   ├── auth.directive.ts
    │   ├── permission.directive.ts
    │   └── cache.directive.ts
    └── utils/
        ├── validators.ts
        └── helpers.ts
```

## Naming Conventions

### Schema Files
- Use `.graphql` extension
- Singular names: `user.graphql`, `post.graphql`
- Main schema: `schema.graphql`

### Resolver Files
- Must end with `.resolver.ts`
- Examples: `user.resolver.ts`, `queries.resolver.ts`

### Directive Files
- Must end with `.directive.ts`
- Examples: `auth.directive.ts`, `cache.directive.ts`

## Organizing by Feature

Group related files together:

```
server/graphql/
├── users/
│   ├── user.graphql          # Types
│   ├── queries.resolver.ts   # User queries
│   ├── mutations.resolver.ts # User mutations
│   └── types.resolver.ts     # Field resolvers
```

## Organizing by Type

Separate queries, mutations, and types:

```
server/graphql/
├── schema.graphql
├── queries/
│   ├── user-queries.resolver.ts
│   └── post-queries.resolver.ts
├── mutations/
│   ├── user-mutations.resolver.ts
│   └── post-mutations.resolver.ts
└── types/
    ├── user-types.resolver.ts
    └── post-types.resolver.ts
```

## Best Practices

1. **One schema file per domain**: `user.graphql`, `post.graphql`
2. **Split resolvers**: Separate queries, mutations, and types
3. **Named exports**: Always use named exports in resolvers
4. **Consistent naming**: Follow a naming pattern across your project
5. **Group related code**: Keep related schemas and resolvers together

## Next Steps

- [Auto-Discovery](/guide/auto-discovery)
- [Schemas](/guide/schemas)
- [Resolvers](/guide/resolvers)
