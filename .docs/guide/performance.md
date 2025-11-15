---
title: Performance
category: Guide
---

# Performance

<FunctionInfo fn="performance"/>

Optimization tips for GraphQL resolvers, caching strategies, and batching.

## N+1 Query Problem

### Problem

```ts
// Bad: N+1 queries
export const postTypes = defineType({
  Post: {
    author: async (parent, _, context) => {
      // This runs once per post!
      return await context.db.user.findUnique({
        where: { id: parent.authorId }
      })
    },
  },
})
```

### Solution: DataLoader

```ts
import DataLoader from 'dataloader'

const userLoader = new DataLoader(async (ids: readonly string[]) => {
  const users = await db.user.findMany({
    where: { id: { in: [...ids] } }
  })
  return ids.map(id => users.find(u => u.id === id))
})

export const postTypes = defineType({
  Post: {
    author: parent => userLoader.load(parent.authorId),
  },
})
```

## Caching

### Field-Level Caching

```ts
const cache = new Map()

export const postQueries = defineQuery({
  post: async (_, { id }) => {
    const cached = cache.get(id)
    if (cached)
      return cached

    const post = await db.post.findUnique({ where: { id } })
    cache.set(id, post)
    return post
  },
})
```

### Redis Caching

```ts
export const postQueries = defineQuery({
  posts: async (_, __, context) => {
    const cached = await context.redis.get('posts')
    if (cached)
      return JSON.parse(cached)

    const posts = await context.db.post.findMany()
    await context.redis.setEx('posts', 300, JSON.stringify(posts))
    return posts
  },
})
```

## Query Optimization

### Limit Fields

```ts
export const userQueries = defineQuery({
  users: (_, { limit = 10 }) => {
    return db.user.findMany({
      take: limit,
      select: { id: true, name: true, email: true },
    })
  },
})
```

### Pagination

```ts
export const postQueries = defineQuery({
  posts: (_, { cursor, limit = 10 }) => {
    return db.post.findMany({
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    })
  },
})
```

## Next Steps

- [Caching Directive](/guide/custom-directives)
- [Context](/guide/context)
- [Resolvers](/guide/resolvers)

---

## Source

<SourceLinks fn="performance"/>

## Contributors

<Contributors fn="performance"/>

## Changelog

<Changelog fn="performance"/>
