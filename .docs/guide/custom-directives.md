# Custom Directives

Create reusable GraphQL directives for authentication, caching, validation, and more.

## What are Directives?

Directives add behavior to schema fields without changing resolvers:

```graphql
type Query {
  profile: User @auth
  adminData: String @auth(requires: "ADMIN")
  expensiveData: String @cache(ttl: 300)
}
```

## Creating a Directive

### Basic Example

```ts
// server/graphql/directives/auth.directive.ts
export const authDirective = defineDirective({
  name: 'auth',
  locations: ['FIELD_DEFINITION'],
  description: 'Requires authentication',
  transformer: (schema) => {
    // Transform schema to add auth logic
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, 'auth')?.[0]
        if (directive) {
          const { resolve = defaultFieldResolver } = fieldConfig
          fieldConfig.resolve = async (source, args, context, info) => {
            if (!context.auth) {
              throw new GraphQLError('Unauthorized')
            }
            return resolve(source, args, context, info)
          }
        }
        return fieldConfig
      },
    })
  },
})
```

### With Arguments

```ts
export const cacheDirective = defineDirective({
  name: 'cache',
  locations: ['FIELD_DEFINITION'],
  args: {
    ttl: { type: 'Int!', defaultValue: 60 },
    scope: { type: 'String', defaultValue: 'PUBLIC' },
  },
  transformer: (schema) => {
    // Implement caching logic
    return schema
  },
})
```

## Real-World Examples

See the [playgrounds/nitro/server/graphql/directives/](https://github.com/productdevbook/nitro-graphql/tree/main/playgrounds/nitro/server/graphql/directives) directory for complete examples:

- `auth.directive.ts` - Authentication
- `permission.directive.ts` - Role-based access
- `cache.directive.ts` - Field-level caching
- `rate-limit.directive.ts` - Rate limiting
- `validate.directive.ts` - Input validation

## Next Steps

- [Schemas](/guide/schemas)
- [Context](/guide/context)
- [Resolvers](/guide/resolvers)
